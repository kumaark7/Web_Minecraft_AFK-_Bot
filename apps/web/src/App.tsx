import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { AuthUser, HealthResponse, ServerRecord } from '@larry/shared';

const apiBase = 'http://localhost:3001/api';

type AuthMode = 'login' | 'register';

interface AuthForm {
  username: string;
  email: string;
  password: string;
}

interface ServerForm {
  name: string;
  host: string;
  port: string;
  version: string;
}

const emptyAuthForm: AuthForm = {
  username: '',
  email: '',
  password: '',
};

const emptyServerForm: ServerForm = {
  name: '',
  host: '',
  port: '25565',
  version: '',
};

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm);
  const [serverForm, setServerForm] = useState<ServerForm>(emptyServerForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const onlineCount = useMemo(() => servers.length, [servers]);

  async function loadServers() {
    const data = await apiRequest<ServerRecord[]>('/servers');
    setServers(data);
  }

  useEffect(() => {
    async function loadInitialState() {
      try {
        const [healthData, authData] = await Promise.all([
          apiRequest<HealthResponse>('/health'),
          apiRequest<{ user: AuthUser }>('/auth/me').catch(() => null),
        ]);

        setHealth(healthData);
        if (authData?.user) {
          setUser(authData.user);
          await loadServers();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load Larry Control');
      } finally {
        setLoading(false);
      }
    }

    void loadInitialState();
  }, []);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const payload = authMode === 'register'
        ? authForm
        : { email: authForm.email, password: authForm.password };
      const data = await apiRequest<{ user: AuthUser }>(`/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setUser(data.user);
      setAuthForm(emptyAuthForm);
      await loadServers();
      setMessage(authMode === 'register' ? 'Account created.' : 'Logged in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  async function handleLogout() {
    setError(null);
    setMessage(null);

    await apiRequest<void>('/auth/logout', { method: 'POST' });
    setUser(null);
    setServers([]);
    setEditingId(null);
    setServerForm(emptyServerForm);
    setMessage('Logged out.');
  }

  async function handleServerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const payload = {
      name: serverForm.name,
      host: serverForm.host,
      port: Number(serverForm.port),
      version: serverForm.version || null,
      authMode: 'offline',
    };

    try {
      await apiRequest<ServerRecord>(editingId ? `/servers/${editingId}` : '/servers', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setServerForm(emptyServerForm);
      setEditingId(null);
      await loadServers();
      setMessage(editingId ? 'Server updated.' : 'Server added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save server');
    }
  }

  async function handleDeleteServer(id: string) {
    setError(null);
    setMessage(null);

    try {
      await apiRequest<{ ok: true }>(`/servers/${id}`, { method: 'DELETE' });
      await loadServers();
      if (editingId === id) {
        setEditingId(null);
        setServerForm(emptyServerForm);
      }
      setMessage('Server deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete server');
    }
  }

  function startEditing(server: ServerRecord) {
    setEditingId(server.id);
    setServerForm({
      name: server.name,
      host: server.host,
      port: String(server.port),
      version: server.version || '',
    });
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Offline-mode Minecraft control</p>
          <h1 style={styles.title}>Larry Control</h1>
        </div>
        <div style={styles.statusPill}>
          API {health?.status === 'ok' ? 'online' : loading ? 'checking' : 'offline'}
        </div>
      </section>

      {(message || error) && (
        <div style={{ ...styles.notice, ...(error ? styles.errorNotice : styles.successNotice) }}>
          {error || message}
        </div>
      )}

      {!user ? (
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>{authMode === 'login' ? 'Login' : 'Create Account'}</h2>
            <button
              style={styles.linkButton}
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError(null);
                setMessage(null);
              }}
            >
              {authMode === 'login' ? 'Need an account?' : 'Already registered?'}
            </button>
          </div>

          <form style={styles.form} onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <label style={styles.label}>
                Username
                <input
                  style={styles.input}
                  value={authForm.username}
                  onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
                  minLength={3}
                  required
                />
              </label>
            )}
            <label style={styles.label}>
              Email
              <input
                style={styles.input}
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                required
              />
            </label>
            <label style={styles.label}>
              Password
              <input
                style={styles.input}
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                minLength={8}
                required
              />
            </label>
            <button style={styles.primaryButton} type="submit">
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
        </section>
      ) : (
        <section style={styles.grid}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Servers</h2>
                <p style={styles.muted}>{onlineCount} saved offline-mode server{onlineCount === 1 ? '' : 's'}</p>
              </div>
              <button style={styles.secondaryButton} type="button" onClick={() => void handleLogout()}>
                Logout
              </button>
            </div>

            <form style={styles.form} onSubmit={handleServerSubmit}>
              <label style={styles.label}>
                Name
                <input
                  style={styles.input}
                  value={serverForm.name}
                  onChange={(event) => setServerForm({ ...serverForm, name: event.target.value })}
                  required
                />
              </label>
              <label style={styles.label}>
                Host / IP
                <input
                  style={styles.input}
                  value={serverForm.host}
                  onChange={(event) => setServerForm({ ...serverForm, host: event.target.value })}
                  required
                />
              </label>
              <div style={styles.formRow}>
                <label style={styles.label}>
                  Port
                  <input
                    style={styles.input}
                    type="number"
                    min={1}
                    max={65535}
                    value={serverForm.port}
                    onChange={(event) => setServerForm({ ...serverForm, port: event.target.value })}
                    required
                  />
                </label>
                <label style={styles.label}>
                  Version
                  <input
                    style={styles.input}
                    placeholder="Optional"
                    value={serverForm.version}
                    onChange={(event) => setServerForm({ ...serverForm, version: event.target.value })}
                  />
                </label>
              </div>
              <div style={styles.actions}>
                <button style={styles.primaryButton} type="submit">
                  {editingId ? 'Update Server' : 'Add Server'}
                </button>
                {editingId && (
                  <button
                    style={styles.secondaryButton}
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setServerForm(emptyServerForm);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Account</h2>
                <p style={styles.muted}>{user.username} · {user.email}</p>
              </div>
            </div>

            <div style={styles.serverList}>
              {servers.length === 0 ? (
                <p style={styles.empty}>No servers yet.</p>
              ) : servers.map((server) => (
                <article key={server.id} style={styles.serverCard}>
                  <div>
                    <h3 style={styles.serverName}>{server.name}</h3>
                    <p style={styles.muted}>{server.host}:{server.port}</p>
                    <p style={styles.tag}>{server.authMode} {server.version ? `· ${server.version}` : ''}</p>
                  </div>
                  <div style={styles.actions}>
                    <button style={styles.secondaryButton} type="button" onClick={() => startEditing(server)}>
                      Edit
                    </button>
                    <button style={styles.dangerButton} type="button" onClick={() => void handleDeleteServer(server.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    margin: 0,
    padding: '32px',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: '#f7f8fb',
    color: '#172033',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    maxWidth: '1120px',
    margin: '0 auto 24px',
  },
  eyebrow: {
    margin: '0 0 6px',
    color: '#536179',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    fontSize: '36px',
    lineHeight: 1.1,
  },
  statusPill: {
    border: '1px solid #cfd7e6',
    borderRadius: '999px',
    padding: '8px 12px',
    background: '#ffffff',
    fontSize: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 420px) minmax(320px, 1fr)',
    gap: '20px',
    maxWidth: '1120px',
    margin: '0 auto',
  },
  panel: {
    maxWidth: '1120px',
    margin: '0 auto',
    border: '1px solid #dce2ec',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '20px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '18px',
  },
  panelTitle: {
    margin: 0,
    fontSize: '22px',
  },
  muted: {
    margin: '4px 0 0',
    color: '#667187',
    fontSize: '14px',
  },
  form: {
    display: 'grid',
    gap: '14px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  label: {
    display: 'grid',
    gap: '6px',
    color: '#344054',
    fontSize: '14px',
    fontWeight: 600,
  },
  input: {
    minHeight: '40px',
    border: '1px solid #cfd7e6',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '15px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  primaryButton: {
    border: 0,
    borderRadius: '6px',
    background: '#1769e0',
    color: '#ffffff',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #cfd7e6',
    borderRadius: '6px',
    background: '#ffffff',
    color: '#1f2a44',
    padding: '9px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  dangerButton: {
    border: '1px solid #f2b8b5',
    borderRadius: '6px',
    background: '#fff8f7',
    color: '#b42318',
    padding: '9px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  linkButton: {
    border: 0,
    background: 'transparent',
    color: '#1769e0',
    cursor: 'pointer',
    fontWeight: 700,
  },
  notice: {
    maxWidth: '1120px',
    margin: '0 auto 16px',
    borderRadius: '6px',
    padding: '12px 14px',
    fontWeight: 600,
  },
  successNotice: {
    background: '#ecfdf3',
    color: '#027a48',
  },
  errorNotice: {
    background: '#fff1f3',
    color: '#b42318',
  },
  serverList: {
    display: 'grid',
    gap: '12px',
  },
  serverCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    border: '1px solid #dce2ec',
    borderRadius: '8px',
    padding: '14px',
  },
  serverName: {
    margin: 0,
    fontSize: '18px',
  },
  tag: {
    margin: '8px 0 0',
    color: '#1769e0',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  empty: {
    margin: 0,
    color: '#667187',
  },
};
