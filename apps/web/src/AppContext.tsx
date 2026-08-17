import React, { createContext, useContext, useEffect, useState } from 'react';
import type {
  AuthForm,
  AuthUser,
  BotBulkActionResponse,
  BotCommandResponse,
  BotForm,
  BotRecord,
  BotRuntimeState,
  HealthResponse,
  ServerForm,
  ServerRecord,
} from './api';
import { apiRequest } from './api';

export const emptyAuthForm: AuthForm = {
  username: '',
  email: '',
  password: '',
};

export const emptyServerForm: ServerForm = {
  name: '',
  host: '',
  port: '25565',
  version: '',
};

export const emptyBotForm: BotForm = {
  serverId: '',
  name: '',
  mcUsername: '',
};

interface AppContextValue {
  health: HealthResponse | null;
  user: AuthUser | null;
  servers: ServerRecord[];
  bots: BotRecord[];
  runtimeStates: Record<string, BotRuntimeState>;
  commandForms: Record<string, string>;
  commandHistory: Record<string, string[]>;
  message: string | null;
  error: string | null;
  loading: boolean;
  setCommandForms: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loadServers: () => Promise<void>;
  loadBots: () => Promise<void>;
  loadBotRuntime: (botId: string) => Promise<void>;
  loadBotRuntimes: () => Promise<void>;
  login: (form: AuthForm) => Promise<void>;
  register: (form: AuthForm) => Promise<void>;
  logout: () => Promise<void>;
  saveServer: (form: ServerForm, editingId?: string | null) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  createBot: (form: BotForm) => Promise<void>;
  startBot: (botId: string) => Promise<void>;
  stopBot: (botId: string) => Promise<void>;
  restartBot: (botId: string) => Promise<void>;
  deleteBot: (botId: string) => Promise<void>;
  toggleAntiAfk: (botId: string) => Promise<void>;
  sendCommand: (botId: string) => Promise<void>;
  bulkBotAction: (action: 'start-all' | 'stop-all' | 'restart-all') => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function runtimeFallback(bot: BotRecord): BotRuntimeState {
  return {
    botId: bot.id,
    status: bot.status,
    logs: [],
    startedAt: null,
    lastError: null,
    reconnectAttempts: 0,
    lastCommandAt: null,
    antiAfkEnabled: false,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [runtimeStates, setRuntimeStates] = useState<Record<string, BotRuntimeState>>({});
  const [commandForms, setCommandForms] = useState<Record<string, string>>({});
  const [commandHistory, setCommandHistory] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadServers() {
    setServers(await apiRequest<ServerRecord[]>('/servers'));
  }

  async function loadBots() {
    const data = await apiRequest<BotRecord[]>('/bots');
    setBots(data);
    setRuntimeStates((current) => data.reduce<Record<string, BotRuntimeState>>((next, bot) => {
      next[bot.id] = current[bot.id] || runtimeFallback(bot);
      return next;
    }, {}));
  }

  async function loadBotRuntime(botId: string) {
    const data = await apiRequest<BotRuntimeState>(`/bots/${botId}/runtime`);
    setRuntimeStates((current) => ({ ...current, [botId]: data }));
  }

  async function loadBotRuntimes() {
    const data = await apiRequest<BotRuntimeState[]>('/bots/runtimes');
    setRuntimeStates((current) => data.reduce<Record<string, BotRuntimeState>>((next, runtime) => {
      next[runtime.botId] = {
        ...runtime,
        logs: runtime.logs.length > 0 ? runtime.logs : current[runtime.botId]?.logs || [],
      };
      return next;
    }, { ...current }));
  }

  async function hydrateSession() {
    try {
      const [healthData, authData] = await Promise.all([
        apiRequest<HealthResponse>('/health'),
        apiRequest<{ user: AuthUser }>('/auth/me').catch(() => null),
      ]);

      setHealth(healthData);
      if (authData?.user) {
        setUser(authData.user);
        await loadServers();
        await loadBots();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Larry Control');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void hydrateSession();
    // Session bootstrap should run once on app load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || bots.length === 0) return undefined;

    const intervalId = window.setInterval(() => {
      void loadBotRuntimes().catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [user, bots.length]);

  async function authenticate(mode: 'login' | 'register', form: AuthForm) {
    setError(null);
    setMessage(null);

    const payload = mode === 'register' ? form : { email: form.email, password: form.password };
    const data = await apiRequest<{ user: AuthUser }>(`/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setUser(data.user);
    await loadServers();
    await loadBots();
    setMessage(mode === 'register' ? 'Account created.' : 'Logged in.');
  }

  async function login(form: AuthForm) {
    await authenticate('login', form);
  }

  async function register(form: AuthForm) {
    await authenticate('register', form);
  }

  async function logout() {
    setError(null);
    setMessage(null);
    await apiRequest<void>('/auth/logout', { method: 'POST' });
    setUser(null);
    setServers([]);
    setBots([]);
    setRuntimeStates({});
    setCommandForms({});
    setCommandHistory({});
    setMessage('Logged out.');
  }

  async function saveServer(form: ServerForm, editingId?: string | null) {
    setError(null);
    setMessage(null);
    await apiRequest<ServerRecord>(editingId ? `/servers/${editingId}` : '/servers', {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify({
        name: form.name,
        host: form.host,
        port: Number(form.port),
        version: form.version || null,
        authMode: 'offline',
      }),
    });
    await loadServers();
    setMessage(editingId ? 'Server updated.' : 'Server added.');
  }

  async function deleteServer(id: string) {
    setError(null);
    setMessage(null);
    await apiRequest<{ ok: true }>(`/servers/${id}`, { method: 'DELETE' });
    await loadServers();
    setMessage('Server deleted.');
  }

  async function createBot(form: BotForm) {
    setError(null);
    setMessage(null);
    const bot = await apiRequest<BotRecord>('/bots', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    await loadBots();
    await loadBotRuntime(bot.id);
    setMessage('Bot created.');
  }

  async function startBot(botId: string) {
    setError(null);
    setMessage(null);
    const runtime = await apiRequest<BotRuntimeState>(`/bots/${botId}/start`, { method: 'POST' });
    setRuntimeStates((current) => ({ ...current, [botId]: runtime }));
    await loadBots();
    setMessage('Bot start requested.');
  }

  async function stopBot(botId: string) {
    setError(null);
    setMessage(null);
    await apiRequest<{ ok: true }>(`/bots/${botId}/stop`, { method: 'POST' });
    await loadBots();
    await loadBotRuntime(botId);
    setMessage('Bot stopped.');
  }

  async function restartBot(botId: string) {
    setError(null);
    setMessage(null);
    const runtime = await apiRequest<BotRuntimeState>(`/bots/${botId}/restart`, { method: 'POST' });
    setRuntimeStates((current) => ({ ...current, [botId]: runtime }));
    await loadBots();
    setMessage('Bot restart requested.');
  }

  async function deleteBot(botId: string) {
    setError(null);
    setMessage(null);
    await apiRequest<{ ok: true }>(`/bots/${botId}`, { method: 'DELETE' });
    setRuntimeStates((current) => {
      const next = { ...current };
      delete next[botId];
      return next;
    });
    await loadBots();
    setMessage('Bot deleted.');
  }

  async function toggleAntiAfk(botId: string) {
    setError(null);
    setMessage(null);
    const enabled = !(runtimeStates[botId]?.antiAfkEnabled || false);
    const response = await apiRequest<{ ok: true; runtime: BotRuntimeState }>(`/bots/${botId}/anti-afk`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
    setRuntimeStates((current) => ({ ...current, [botId]: response.runtime }));
    setMessage(`Anti AFK ${enabled ? 'enabled' : 'disabled'}.`);
  }

  async function sendCommand(botId: string) {
    setError(null);
    setMessage(null);
    const command = commandForms[botId] || '';
    const response = await apiRequest<BotCommandResponse>(`/bots/${botId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    setRuntimeStates((current) => ({ ...current, [botId]: response.runtime }));
    setCommandForms((current) => ({ ...current, [botId]: '' }));
    setCommandHistory((current) => ({
      ...current,
      [botId]: [command, ...(current[botId] || []).filter((entry) => entry !== command)].slice(0, 5),
    }));
    setMessage('Command sent.');
  }

  async function bulkBotAction(action: 'start-all' | 'stop-all' | 'restart-all') {
    setError(null);
    setMessage(null);
    const response = await apiRequest<BotBulkActionResponse>(`/bots/${action}`, { method: 'POST' });
    setRuntimeStates((current) => response.results.reduce<Record<string, BotRuntimeState>>((next, result) => {
      if (result.runtime) next[result.botId] = result.runtime;
      return next;
    }, { ...current }));
    await loadBots();
    const failed = response.results.filter((result) => !result.ok);
    setMessage(failed.length > 0
      ? `${response.results.length - failed.length} bot action${response.results.length - failed.length === 1 ? '' : 's'} completed, ${failed.length} failed.`
      : `${response.results.length} bot action${response.results.length === 1 ? '' : 's'} completed.`);
  }

  const value: AppContextValue = {
    health,
    user,
    servers,
    bots,
    runtimeStates,
    commandForms,
    commandHistory,
    message,
    error,
    loading,
    setCommandForms,
    setMessage,
    setError,
    loadServers,
    loadBots,
    loadBotRuntime,
    loadBotRuntimes,
    login,
    register,
    logout,
    saveServer,
    deleteServer,
    createBot,
    startBot,
    stopBot,
    restartBot,
    deleteBot,
    toggleAntiAfk,
    sendCommand,
    bulkBotAction,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useLarry() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useLarry must be used inside AppProvider');
  return value;
}
