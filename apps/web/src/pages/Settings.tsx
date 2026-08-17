import React from 'react';
import { Database, LogOut, Server, Settings as SettingsIcon, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui-custom/Button';
import { Badge } from '@/components/ui-custom/Badge';
import { colors, commonStyles, fonts } from '@/styles/theme';
import { useLarry } from '@/AppContext';

const Settings: React.FC = () => {
  const { user, health, servers, bots, logout, setError } = useLarry();

  const rows = [
    { label: 'API', value: health?.status || 'Unknown', icon: Server },
    { label: 'Health', value: health?.message || 'Unknown', icon: Database },
    { label: 'Servers', value: String(servers.length), icon: SettingsIcon },
    { label: 'Bots', value: String(bots.length), icon: User },
  ];

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 200ms ease-out' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.foreground, fontFamily: fonts.heading, marginBottom: '6px' }}>
            Settings
          </h1>
          <p style={{ fontSize: '15px', color: colors.foregroundMuted, margin: 0 }}>
            Account and lightweight deployment status.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={commonStyles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', backgroundColor: `${colors.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color={colors.primaryLight} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground }}>Account</div>
                <div style={{ fontSize: '13px', color: colors.foregroundMuted }}>{user?.email || 'Signed in user'}</div>
              </div>
            </div>
            <InfoRow label="Username" value={user?.username || '-'} />
            <InfoRow label="Email" value={user?.email || '-'} />
            <div style={{ marginTop: '18px' }}>
              <Button variant="danger" leftIcon={<LogOut size={16} />} onClick={() => void logout().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to logout'))}>
                Logout
              </Button>
            </div>
          </div>

          <div style={commonStyles.card}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground, marginBottom: '16px' }}>
              System
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {rows.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', backgroundColor: colors.background, border: `1px solid ${colors.border}`, borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} color={colors.foregroundMuted} />
                      <span style={{ fontSize: '14px', color: colors.foreground }}>{row.label}</span>
                    </div>
                    <Badge variant={row.value.toLowerCase() === 'online' ? 'success' : 'default'}>{row.value}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
    <span style={{ fontSize: '13px', color: colors.foregroundMuted }}>{label}</span>
    <span style={{ fontSize: '13px', color: colors.foreground, fontWeight: 600 }}>{value}</span>
  </div>
);

export default Settings;
