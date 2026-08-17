import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  Server,
  Settings,
} from 'lucide-react';
import { colors, commonStyles, fonts } from '@/styles/theme';
import { useLarry } from '@/AppContext';
import { MinecraftAvatar } from '@/components/common/MinecraftAvatar';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Servers', path: '/servers', icon: Server },
  { name: 'Bots', path: '/bots', icon: Boxes },
  { name: 'Activity', path: '/activity', icon: Activity },
  { name: 'Logs', path: '/logs', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { bots, servers, runtimeStates, user, logout } = useLarry();
  const onlineBots = bots.filter((bot) => runtimeStates[bot.id]?.status === 'ONLINE' || bot.status === 'ONLINE').length;

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      style={{
        ...commonStyles.sidebar,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ ...commonStyles.flexRow, gap: '12px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Boxes size={22} color={colors.onPrimary} />
          </div>
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                fontFamily: fonts.heading,
                letterSpacing: '0.5px',
              }}
            >
              LARRY CONTROL
            </div>
            <div style={{ fontSize: '12px', color: colors.foregroundMuted, marginTop: '2px' }}>
              Offline-mode Minecraft control
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '16px', flex: 1 }}>
        <div style={{ ...commonStyles.flexColumn, gap: '4px' }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: active ? colors.onPrimary : colors.foregroundMuted,
                  backgroundColor: active ? colors.primary : 'transparent',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 150ms ease, color 150ms ease',
                }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div
        style={{
          margin: '0 16px 16px',
          padding: '16px',
          backgroundColor: colors.muted,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ ...commonStyles.flexRow, gap: '12px', marginBottom: '12px' }}>
          <MinecraftAvatar
            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.username || 'larry'}&backgroundColor=7c3aed`}
            alt={user?.username || 'Larry user'}
            size={44}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.foreground }}>
              {user?.username || 'User'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: colors.foregroundMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email || ''}
            </div>
            <div
              style={{
                display: 'inline-block',
                marginTop: '6px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: `${colors.primary}20`,
                color: colors.primaryLight,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              USER
            </div>
          </div>
        </div>
        <button
          onClick={() => void logout()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: colors.foreground,
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* System Status */}
      <div
        style={{
          margin: '0 16px 16px',
          padding: '16px',
          backgroundColor: colors.background,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ ...commonStyles.flexRow, gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: colors.success,
              boxShadow: `0 0 8px ${colors.success}`,
            }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: colors.success }}>
              System Status
            </div>
            <div style={{ fontSize: '12px', color: colors.foregroundMuted }}>
              All Systems Operational
            </div>
          </div>
        </div>

        <div style={{ ...commonStyles.flexColumn, gap: '12px' }}>
          <div style={{ ...commonStyles.flexRow, justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: colors.foregroundMuted }}>Bots Online</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.foreground }}>
              {onlineBots} / {bots.length}
            </div>
          </div>
          <div style={{ ...commonStyles.flexRow, justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: colors.foregroundMuted }}>Servers</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.foreground }}>
              {servers.length}
            </div>
          </div>
          <div style={{ ...commonStyles.flexRow, justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: colors.foregroundMuted }}>Uptime</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: colors.foreground }}>
              Live
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          fontSize: '12px',
          color: colors.foregroundMuted,
        }}
      >
        <div>© 2025 Larry Control</div>
        <div style={{ marginTop: '2px' }}>All rights reserved.</div>
      </div>
    </aside>
  );
};
