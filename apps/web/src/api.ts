import type {
  AuthUser,
  BotAntiAfkResponse,
  BotBulkActionResponse,
  BotCommandResponse,
  BotRecord,
  BotRuntimeState,
  HealthResponse,
  ServerRecord,
} from '@larry/shared';

const apiBase = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

export interface AuthForm {
  username: string;
  email: string;
  password: string;
}

export interface ServerForm {
  name: string;
  host: string;
  port: string;
  version: string;
}

export interface BotForm {
  serverId: string;
  name: string;
  mcUsername: string;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(typeof body.error === 'string' ? body.error : 'Request failed');
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export type {
  AuthUser,
  BotAntiAfkResponse,
  BotBulkActionResponse,
  BotCommandResponse,
  BotRecord,
  BotRuntimeState,
  HealthResponse,
  ServerRecord,
};
