export interface HealthResponse {
  status: string;
  timestamp: string;
  message: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface ApiErrorResponse {
  error: string;
}

export interface ServerRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  version: string | null;
  authMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerPayload {
  name: string;
  host: string;
  port: number;
  version?: string | null;
  authMode?: 'offline';
}

export interface BotRecord {
  id: string;
  userId: string;
  serverId: string;
  name: string;
  mcUsername: string;
  status: string;
  config: unknown;
  createdAt: string;
  updatedAt: string;
  server: {
    id: string;
    name: string;
    host: string;
    port: number;
    version: string | null;
    authMode: string;
  };
}

export interface BotPayload {
  serverId: string;
  name: string;
  mcUsername: string;
}

export interface BotRuntimeState {
  botId: string;
  status: string;
  logs: string[];
  startedAt: string | null;
  lastError: string | null;
}
