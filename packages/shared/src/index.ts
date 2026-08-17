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
