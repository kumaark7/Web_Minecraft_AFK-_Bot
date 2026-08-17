import React, { FormEvent, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AppProvider, emptyAuthForm, useLarry } from './AppContext';
import { Button } from '@/components/ui-custom/Button';
import { Input } from '@/components/ui-custom/Input';
import { routes } from './routes';
import { colors, commonStyles, fonts } from '@/styles/theme';

type AuthMode = 'login' | 'register';

const AuthScreen: React.FC = () => {
  const { health, login, register, message, error, loading, setError, setMessage } = useLarry();
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState(emptyAuthForm);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (mode === 'login') {
        await login(form);
      } else {
        await register(form);
      }
      setForm(emptyAuthForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at top left, ${colors.primary}20, transparent 34%), ${colors.background}`,
        color: colors.foreground,
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <section style={{ ...commonStyles.card, width: '100%', maxWidth: 460 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: colors.foregroundMuted, marginBottom: 8 }}>
            Offline-mode Minecraft control
          </div>
          <h1 style={{ margin: 0, fontFamily: fonts.heading, fontSize: 30 }}>Larry Control</h1>
          <div style={{ marginTop: 10, fontSize: 13, color: health?.status === 'ok' ? colors.success : colors.foregroundMuted }}>
            API {health?.status === 'ok' ? 'online' : loading ? 'checking' : 'offline'}
          </div>
        </div>

        {(message || error) && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
              color: error ? colors.danger : colors.success,
              backgroundColor: error ? `${colors.danger}15` : `${colors.success}15`,
            }}
          >
            {error || message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          {mode === 'register' && (
            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: colors.foregroundMuted }}>
              Username
              <Input
                value={form.username}
                minLength={3}
                required
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </label>
          )}
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: colors.foregroundMuted }}>
            Email
            <Input
              type="email"
              value={form.email}
              required
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: colors.foregroundMuted }}>
            Password
            <Input
              type="password"
              value={form.password}
              minLength={8}
              required
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>

          <Button variant="primary" type="submit" fullWidth>
            {mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
              setMessage(null);
            }}
          >
            {mode === 'login' ? 'Need an account?' : 'Already registered?'}
          </Button>
        </form>
      </section>
    </main>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useLarry();

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: colors.background, color: colors.foreground }}>
        Loading Larry Control...
      </main>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={route.element}
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
};

export default App;
