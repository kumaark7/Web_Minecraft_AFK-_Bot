import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'crypto';
import { promisify } from 'util';
import { createBot, Bot as MineflayerBot } from 'mineflayer';
import {
  AuthResponse,
  AuthUser,
  BotBulkActionResponse,
  BotCommandPayload,
  BotCommandResponse,
  BotPayload,
  BotRecord,
  BotRuntimeState,
  HealthResponse,
  ServerPayload,
  ServerRecord,
} from '@larry/shared';
import { prisma } from '@larry/database';

dotenv.config({ path: '../../.env' });

const app = express();
const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const cookieName = 'larry_session';
const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
const scrypt = promisify(scryptCallback);

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

const authSecret = process.env.JWT_SECRET || 'local-development-secret-change-me';

app.use(express.json());

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

interface AuthedRequest extends Request {
  user?: AuthUser;
}

interface TokenPayload extends AuthUser {
  exp: number;
}

interface ManagedBot {
  bot: MineflayerBot;
  userId: string;
  state: BotRuntimeState;
  connectTimeout: NodeJS.Timeout;
  afkInterval: NodeJS.Timeout;
  reconnectTimeout: NodeJS.Timeout | null;
  reconnectAttempts: number;
  stopping: boolean;
}

type BotRecordWithServer = {
  id: string;
  userId: string;
  serverId: string;
  name: string;
  mcUsername: string;
  status: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
  server: {
    id: string;
    name: string;
    host: string;
    port: number;
    version: string | null;
    authMode: string;
  };
};

const managedBots = new Map<string, ManagedBot>();
const botConnectTimeoutMs = Number(process.env.BOT_CONNECT_TIMEOUT_MS || 15000);
const maxActiveBotsPerUser = Number(process.env.MAX_ACTIVE_BOTS_PER_USER || 3);
const afkTickMs = Number(process.env.AFK_TICK_MS || 12000);
const reconnectDelayMs = Number(process.env.BOT_RECONNECT_DELAY_MS || 10000);
const maxReconnectAttempts = Number(process.env.BOT_MAX_RECONNECT_ATTEMPTS || 5);
const commandLogDelayMs = Number(process.env.COMMAND_LOG_DELAY_MS || 5000);

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (!rawName) return cookies;

    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: oneWeekMs,
    path: '/',
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function sign(value: string): string {
  return createHmac('sha256', authSecret).update(value).digest('base64url');
}

function createToken(user: AuthUser): string {
  const payload: TokenPayload = {
    ...user,
    exp: Date.now() + oneWeekMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifyToken(token: string | undefined): AuthUser | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.id || !payload.username || !payload.email || Date.now() > payload.exp) return null;

    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString('base64url')}`;
}

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, salt, storedHash] = passwordHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !storedHash) return false;

  const stored = Buffer.from(storedHash, 'base64url');
  const derived = (await scrypt(password, salt, stored.length)) as Buffer;

  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

function toAuthUser(user: { id: string; username: string; email: string }): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

function toServerRecord(server: {
  id: string;
  name: string;
  host: string;
  port: number;
  version: string | null;
  authMode: string;
  createdAt: Date;
  updatedAt: Date;
}): ServerRecord {
  return {
    ...server,
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
  };
}

function toBotRecord(bot: {
  id: string;
  userId: string;
  serverId: string;
  name: string;
  mcUsername: string;
  status: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
  server: {
    id: string;
    name: string;
    host: string;
    port: number;
    version: string | null;
    authMode: string;
  };
}): BotRecord {
  return {
    ...bot,
    createdAt: bot.createdAt.toISOString(),
    updatedAt: bot.updatedAt.toISOString(),
  };
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidMinecraftVersion(version: string): boolean {
  return /^1\.\d+(?:\.\d+)?$/.test(version);
}

function validateAuthInput(
  body: unknown,
  mode: 'register' | 'login'
): { email: string; password: string; username: string } | { error: string } {
  const input = body as Record<string, unknown>;
  const email = getString(input.email).toLowerCase();
  const password = getString(input.password);
  const username = getString(input.username);

  if (!email || !email.includes('@')) return { error: 'A valid email is required' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };
  if (mode === 'register' && username.length < 3) return { error: 'Username must be at least 3 characters' };

  return { email, password, username };
}

function validateServerPayload(body: unknown): { data?: ServerPayload; error?: string } {
  const input = body as Record<string, unknown>;
  const name = getString(input.name);
  const host = getString(input.host);
  const version = getString(input.version) || null;
  const rawPort = Number(input.port);
  const port = Number.isInteger(rawPort) ? rawPort : 25565;
  const authMode = getString(input.authMode) || 'offline';

  if (name.length < 2) return { error: 'Server name must be at least 2 characters' };
  if (!host) return { error: 'Server host is required' };
  if (port < 1 || port > 65535) return { error: 'Server port must be between 1 and 65535' };
  if (version && !isValidMinecraftVersion(version)) {
    return { error: 'Minecraft version must be blank or look like 1.20.4' };
  }
  if (authMode !== 'offline') return { error: 'Only offline server mode is supported' };

  return {
    data: {
      name,
      host,
      port,
      version,
      authMode: 'offline',
    },
  };
}

function validateBotPayload(body: unknown): { data?: BotPayload; error?: string } {
  const input = body as Record<string, unknown>;
  const serverId = getString(input.serverId);
  const name = getString(input.name);
  const mcUsername = getString(input.mcUsername);

  if (!serverId) return { error: 'Server is required' };
  if (name.length < 2) return { error: 'Bot name must be at least 2 characters' };
  if (!/^[A-Za-z0-9_]{3,16}$/.test(mcUsername)) {
    return { error: 'Minecraft username must be 3-16 letters, numbers, or underscores' };
  }

  return {
    data: {
      serverId,
      name,
      mcUsername,
    },
  };
}

function validateBotCommandPayload(body: unknown): { data?: BotCommandPayload; error?: string } {
  const input = body as Record<string, unknown>;
  const command = getString(input.command);

  if (!command) return { error: 'Command is required' };
  if (command.length > 256) return { error: 'Command must be 256 characters or fewer' };

  return { data: { command } };
}

function appendBotLog(state: BotRuntimeState, message: string) {
  state.logs = [
    ...state.logs.slice(-49),
    `${new Date().toISOString()} ${message}`,
  ];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRuntimeSnapshot(state: BotRuntimeState, logLimit = 50): BotRuntimeState {
  return {
    ...state,
    logs: state.logs.slice(-logLimit),
  };
}

async function stopManagedBot(botId: string, status = 'STOPPED') {
  const managed = managedBots.get(botId);
  if (managed) {
    appendBotLog(managed.state, 'Stopping bot');
    const runtimeBot = managed.bot;

    managed.stopping = true;
    clearTimeout(managed.connectTimeout);
    clearInterval(managed.afkInterval);
    if (managed.reconnectTimeout) clearTimeout(managed.reconnectTimeout);
    managed.bot.removeAllListeners();
    managed.bot.on('error', () => undefined);

    if (typeof runtimeBot.quit === 'function') {
      runtimeBot.quit();
    } else if (typeof runtimeBot.end === 'function') {
      runtimeBot.end('Stopped by Larry Control');
    } else if (typeof runtimeBot._client?.end === 'function') {
      runtimeBot._client.end('Stopped by Larry Control');
    }

    managedBots.delete(botId);
  }

  await prisma.bot.update({
    where: { id: botId },
    data: { status },
  });
}

function getUserActiveBotCount(userId: string): number {
  return [...managedBots.values()].filter((managed) => managed.userId === userId).length;
}

async function resetRuntimeStatuses() {
  await prisma.bot.updateMany({
    where: {
      status: {
        in: ['CONNECTING', 'LOGIN', 'ONLINE'],
      },
    },
    data: {
      status: 'STOPPED',
    },
  });
}

function requireAuth(req: AuthedRequest, res: Response, next: () => void) {
  const token = parseCookies(req.headers.cookie)[cookieName];
  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  req.user = user;
  next();
}

app.get('/api/health', (req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Larry Control API is running',
  };

  res.json(response);
});

app.post('/api/auth/register', async (req: Request, res: Response<AuthResponse | { error: string }>) => {
  const input = validateAuthInput(req.body, 'register');
  if ('error' in input) {
    res.status(400).json({ error: input.error });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: await hashPassword(input.password),
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
    const authUser = toAuthUser(user);

    setAuthCookie(res, createToken(authUser));
    res.status(201).json({ user: authUser });
  } catch {
    res.status(409).json({ error: 'Username or email is already registered' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response<AuthResponse | { error: string }>) => {
  const input = validateAuthInput(req.body, 'login');
  if ('error' in input) {
    res.status(400).json({ error: input.error });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const authUser = toAuthUser(user);
  setAuthCookie(res, createToken(authUser));
  res.json({ user: authUser });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(204).send();
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response<AuthResponse>) => {
  res.json({ user: req.user as AuthUser });
});

app.get('/api/servers', requireAuth, async (req: AuthedRequest, res: Response<ServerRecord[]>) => {
  const servers = await prisma.server.findMany({
    where: { userId: (req.user as AuthUser).id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(servers.map(toServerRecord));
});

app.post('/api/servers', requireAuth, async (req: AuthedRequest, res: Response<ServerRecord | { error: string }>) => {
  const payload = validateServerPayload(req.body);
  if (payload.error || !payload.data) {
    res.status(400).json({ error: payload.error || 'Invalid server payload' });
    return;
  }

  const server = await prisma.server.create({
    data: {
      ...payload.data,
      userId: (req.user as AuthUser).id,
    },
  });

  res.status(201).json(toServerRecord(server));
});

app.get('/api/servers/:id', requireAuth, async (req: AuthedRequest, res: Response<ServerRecord | { error: string }>) => {
  const server = await prisma.server.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  res.json(toServerRecord(server));
});

app.put('/api/servers/:id', requireAuth, async (req: AuthedRequest, res: Response<ServerRecord | { error: string }>) => {
  const payload = validateServerPayload(req.body);
  if (payload.error || !payload.data) {
    res.status(400).json({ error: payload.error || 'Invalid server payload' });
    return;
  }

  const existing = await prisma.server.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  const server = await prisma.server.update({
    where: { id: existing.id },
    data: payload.data,
  });

  res.json(toServerRecord(server));
});

app.delete('/api/servers/:id', requireAuth, async (req: AuthedRequest, res: Response<{ ok: true } | { error: string }>) => {
  const existing = await prisma.server.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  await prisma.server.delete({
    where: { id: existing.id },
  });

  res.json({ ok: true });
});

app.get('/api/bots', requireAuth, async (req: AuthedRequest, res: Response<BotRecord[]>) => {
  const bots = await prisma.bot.findMany({
    where: { userId: (req.user as AuthUser).id },
    include: { server: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(bots.map(toBotRecord));
});

app.get('/api/bots/runtimes', requireAuth, async (req: AuthedRequest, res: Response<BotRuntimeState[]>) => {
  const bots = await prisma.bot.findMany({
    where: { userId: (req.user as AuthUser).id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(bots.map((bot) => {
    const managed = managedBots.get(bot.id);

    return managed ? getRuntimeSnapshot(managed.state, 12) : {
      botId: bot.id,
      status: bot.status,
      logs: [],
      startedAt: null,
      lastError: null,
      reconnectAttempts: 0,
      lastCommandAt: null,
    };
  }));
});

app.post('/api/bots/start-all', requireAuth, async (req: AuthedRequest, res: Response<BotBulkActionResponse>) => {
  const bots = await prisma.bot.findMany({
    where: { userId: (req.user as AuthUser).id },
    include: { server: true },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];
  for (const bot of bots) {
    const result = await startManagedBot(bot.id, (req.user as AuthUser).id);
    results.push({
      botId: bot.id,
      ok: result.statusCode >= 200 && result.statusCode < 300,
      ...(result.statusCode >= 200 && result.statusCode < 300
        ? { runtime: result.body as BotRuntimeState }
        : { error: (result.body as { error: string }).error }),
    });
  }

  res.json({ results });
});

app.post('/api/bots/stop-all', requireAuth, async (req: AuthedRequest, res: Response<BotBulkActionResponse>) => {
  const bots = await prisma.bot.findMany({
    where: { userId: (req.user as AuthUser).id },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];
  for (const bot of bots) {
    await stopManagedBot(bot.id);
    results.push({
      botId: bot.id,
      ok: true,
      runtime: {
        botId: bot.id,
        status: 'STOPPED',
        logs: [],
        startedAt: null,
        lastError: null,
        reconnectAttempts: 0,
        lastCommandAt: null,
      },
    });
  }

  res.json({ results });
});

app.post('/api/bots/restart-all', requireAuth, async (req: AuthedRequest, res: Response<BotBulkActionResponse>) => {
  const bots = await prisma.bot.findMany({
    where: { userId: (req.user as AuthUser).id },
    include: { server: true },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];
  for (const bot of bots) {
    await stopManagedBot(bot.id);
    const result = await startManagedBot(bot.id, (req.user as AuthUser).id);
    results.push({
      botId: bot.id,
      ok: result.statusCode >= 200 && result.statusCode < 300,
      ...(result.statusCode >= 200 && result.statusCode < 300
        ? { runtime: result.body as BotRuntimeState }
        : { error: (result.body as { error: string }).error }),
    });
  }

  res.json({ results });
});

app.post('/api/bots', requireAuth, async (req: AuthedRequest, res: Response<BotRecord | { error: string }>) => {
  const payload = validateBotPayload(req.body);
  if (payload.error || !payload.data) {
    res.status(400).json({ error: payload.error || 'Invalid bot payload' });
    return;
  }

  const server = await prisma.server.findFirst({
    where: {
      id: payload.data.serverId,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return;
  }

  const bot = await prisma.bot.create({
    data: {
      userId: (req.user as AuthUser).id,
      serverId: server.id,
      name: payload.data.name,
      mcUsername: payload.data.mcUsername,
      config: {},
    },
    include: { server: true },
  });

  res.status(201).json(toBotRecord(bot));
});

app.delete('/api/bots/:id', requireAuth, async (req: AuthedRequest, res: Response<{ ok: true } | { error: string }>) => {
  const existing = await prisma.bot.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  await stopManagedBot(existing.id);
  await prisma.bot.delete({
    where: { id: existing.id },
  });

  res.json({ ok: true });
});

async function startManagedBot(
  botIdToStart: string,
  userId: string,
): Promise<{ statusCode: number; body: BotRuntimeState | { error: string } }> {
  if (managedBots.has(botIdToStart)) {
    return { statusCode: 409, body: { error: 'Bot is already running' } };
  }

  if (getUserActiveBotCount(userId) >= maxActiveBotsPerUser) {
    return { statusCode: 429, body: { error: `Active bot limit reached. Maximum active bots: ${maxActiveBotsPerUser}` } };
  }

  const botRecord = await prisma.bot.findFirst({
    where: {
      id: botIdToStart,
      userId,
    },
    include: { server: true },
  });

  if (!botRecord) {
    return { statusCode: 404, body: { error: 'Bot not found' } };
  }

  if (botRecord.server.authMode !== 'offline') {
    return { statusCode: 400, body: { error: 'Only offline server mode is supported' } };
  }

  if (botRecord.server.version && !isValidMinecraftVersion(botRecord.server.version)) {
    return {
      statusCode: 400,
      body: {
        error: 'Saved server has an invalid Minecraft version. Edit the server and leave version blank or use a value like 1.20.4',
      },
    };
  }

  return launchManagedBot(botRecord, userId, 0);
}

async function launchManagedBot(
  botRecord: BotRecordWithServer,
  userId: string,
  reconnectAttempts: number,
  previousLogs: string[] = [],
): Promise<{ statusCode: number; body: BotRuntimeState | { error: string } }> {
  const botId = botRecord.id;
  const state: BotRuntimeState = {
    botId,
    status: 'CONNECTING',
    logs: previousLogs.slice(-30),
    startedAt: new Date().toISOString(),
    lastError: null,
    reconnectAttempts,
    lastCommandAt: null,
  };

  appendBotLog(
    state,
    reconnectAttempts > 0
      ? `Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} for ${botRecord.mcUsername}`
      : `Connecting ${botRecord.mcUsername} to ${botRecord.server.host}:${botRecord.server.port}`,
  );

  const mineflayerBot = createBot({
    host: botRecord.server.host,
    port: botRecord.server.port,
    username: botRecord.mcUsername,
    auth: 'offline',
    ...(botRecord.server.version ? { version: botRecord.server.version } : {}),
  });

  function scheduleReconnect(reason: string) {
    const managed = managedBots.get(botId);
    if (!managed || managed.stopping || state.status === 'RECONNECTING') return;

    clearTimeout(connectTimeout);
    clearInterval(afkInterval);

    if (managed.reconnectAttempts >= maxReconnectAttempts) {
      state.status = 'ERROR';
      state.lastError = reason;
      appendBotLog(state, `Reconnect stopped after ${maxReconnectAttempts} attempt${maxReconnectAttempts === 1 ? '' : 's'}`);
      managedBots.delete(botId);
      void prisma.bot.update({ where: { id: botId }, data: { status: 'ERROR' } });
      return;
    }

    managed.reconnectAttempts += 1;
    state.status = 'RECONNECTING';
    state.reconnectAttempts = managed.reconnectAttempts;
    state.lastError = reason;
    appendBotLog(state, `Reconnecting in ${Math.round(reconnectDelayMs / 1000)}s`);
    void prisma.bot.update({ where: { id: botId }, data: { status: 'CONNECTING' } });

    managed.reconnectTimeout = setTimeout(() => {
      managedBots.delete(botId);
      void prisma.bot.findFirst({
        where: {
          id: botId,
          userId,
        },
        include: { server: true },
      }).then((freshBot) => {
        if (!freshBot) return;
        void launchManagedBot(freshBot, userId, managed.reconnectAttempts, state.logs);
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        state.status = 'ERROR';
        state.lastError = message;
        appendBotLog(state, `Reconnect failed: ${message}`);
        void prisma.bot.update({ where: { id: botId }, data: { status: 'ERROR' } });
      });
    }, reconnectDelayMs);
  }

  function markRuntimeError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (state.status !== 'RECONNECTING') state.status = 'ERROR';
    state.lastError = message;
    appendBotLog(state, `Error: ${message}`);
    void prisma.bot.update({ where: { id: botId }, data: { status: 'ERROR' } });
    scheduleReconnect(message);
  }

  const connectTimeout = setTimeout(() => {
    if (state.status === 'CONNECTING' || state.status === 'LOGIN') {
      markRuntimeError(new Error(`Bot did not come online within ${botConnectTimeoutMs}ms`));
    }
  }, botConnectTimeoutMs);

  let afkStep = 0;
  const afkInterval = setInterval(() => {
    const managed = managedBots.get(botId);
    if (!managed || managed.stopping || state.status !== 'ONLINE') return;

    afkStep += 1;
    const shouldWalk = afkStep % 2 === 0;
    const shouldSneak = afkStep % 5 === 0;

    try {
      mineflayerBot.setControlState('forward', shouldWalk);
      mineflayerBot.setControlState('jump', true);
      mineflayerBot.setControlState('sneak', shouldSneak);

      if (mineflayerBot.entity) {
        mineflayerBot.look(mineflayerBot.entity.yaw + 0.35, mineflayerBot.entity.pitch, true);
      }

      setTimeout(() => {
        if (!managedBots.has(botId)) return;
        mineflayerBot.setControlState('forward', false);
        mineflayerBot.setControlState('jump', false);
        mineflayerBot.setControlState('sneak', false);
      }, 900);
    } catch (err: unknown) {
      markRuntimeError(err);
    }
  }, afkTickMs);

  managedBots.set(botId, {
    bot: mineflayerBot,
    userId,
    state,
    connectTimeout,
    afkInterval,
    reconnectTimeout: null,
    reconnectAttempts,
    stopping: false,
  });

  await prisma.bot.update({
    where: { id: botRecord.id },
    data: { status: 'CONNECTING' },
  });

  mineflayerBot.once('login', () => {
    state.status = 'LOGIN';
    appendBotLog(state, 'Login successful');
    void prisma.bot.update({ where: { id: botRecord.id }, data: { status: 'LOGIN' } });
  });

  mineflayerBot.once('spawn', () => {
    clearTimeout(connectTimeout);
    state.status = 'ONLINE';
    state.lastError = null;
    appendBotLog(state, 'Spawned and online');
    void prisma.bot.update({ where: { id: botRecord.id }, data: { status: 'ONLINE' } });
  });

  mineflayerBot.on('message', (message) => {
    appendBotLog(state, `[CHAT] ${message.toString()}`);
  });

  mineflayerBot.once('end', (reason) => {
    clearTimeout(connectTimeout);
    clearInterval(afkInterval);
    const managed = managedBots.get(botId);
    const message = reason || 'connection ended';

    if (managed?.stopping) {
      state.status = 'STOPPED';
      appendBotLog(state, `Disconnected: ${message}`);
      managedBots.delete(botRecord.id);
      void prisma.bot.update({ where: { id: botRecord.id }, data: { status: 'STOPPED' } });
      return;
    }

    appendBotLog(state, `Disconnected: ${message}`);
    scheduleReconnect(message);
  });

  mineflayerBot.once('error', markRuntimeError);
  mineflayerBot._client.on('error', markRuntimeError);

  return { statusCode: 202, body: getRuntimeSnapshot(state) };
}

app.post('/api/bots/:id/start', requireAuth, async (req: AuthedRequest, res: Response<BotRuntimeState | { error: string }>) => {
  const result = await startManagedBot(req.params.id, (req.user as AuthUser).id);
  res.status(result.statusCode).json(result.body);
});

app.post('/api/bots/:id/restart', requireAuth, async (req: AuthedRequest, res: Response<BotRuntimeState | { error: string }>) => {
  const existing = await prisma.bot.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  await stopManagedBot(existing.id);
  const result = await startManagedBot(existing.id, (req.user as AuthUser).id);
  res.status(result.statusCode).json(result.body);
});

app.post('/api/bots/:id/stop', requireAuth, async (req: AuthedRequest, res: Response<{ ok: true } | { error: string }>) => {
  const existing = await prisma.bot.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  await stopManagedBot(existing.id);
  res.json({ ok: true });
});

app.post('/api/bots/:id/command', requireAuth, async (req: AuthedRequest, res: Response<BotCommandResponse | { error: string }>) => {
  const payload = validateBotCommandPayload(req.body);
  if (payload.error || !payload.data) {
    res.status(400).json({ error: payload.error || 'Invalid command payload' });
    return;
  }

  const existing = await prisma.bot.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const managed = managedBots.get(existing.id);
  if (!managed || managed.state.status !== 'ONLINE') {
    res.status(409).json({ error: 'Bot must be online before sending commands' });
    return;
  }

  managed.bot.chat(payload.data.command);
  appendBotLog(managed.state, `[COMMAND] ${payload.data.command}`);
  managed.state.lastCommandAt = new Date().toISOString();
  await wait(commandLogDelayMs);

  res.json({
    ok: true,
    runtime: getRuntimeSnapshot(managed.state, 12),
  });
});

app.get('/api/bots/:id/runtime', requireAuth, async (req: AuthedRequest, res: Response<BotRuntimeState | { error: string }>) => {
  const existing = await prisma.bot.findFirst({
    where: {
      id: req.params.id,
      userId: (req.user as AuthUser).id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const managed = managedBots.get(existing.id);
  res.json(managed ? getRuntimeSnapshot(managed.state, 12) : {
    botId: existing.id,
    status: existing.status,
    logs: [],
    startedAt: null,
    lastError: null,
    reconnectAttempts: 0,
    lastCommandAt: null,
  });
});

async function startServer() {
  try {
    await prisma.$connect();
    await resetRuntimeStatuses();

    console.log(
      '[Backend] Successfully connected to PostgreSQL via Prisma.'
    );

    app.listen(port, () => {
      console.log(
        `[Backend] Server is running on http://localhost:${port}`
      );
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    console.error(
      '[Backend] Failed to connect to the database:',
      message
    );

    process.exit(1);
  }
}

startServer();
