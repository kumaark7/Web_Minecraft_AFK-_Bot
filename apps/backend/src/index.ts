import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'crypto';
import { promisify } from 'util';
import {
  AuthResponse,
  AuthUser,
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

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

async function startServer() {
  try {
    await prisma.$connect();

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
