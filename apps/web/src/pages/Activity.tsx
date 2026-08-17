import React, { useMemo } from 'react';
import { Activity as ActivityIcon, Bot, Command, Server } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { colors, commonStyles, fonts } from '@/styles/theme';
import { useLarry } from '@/AppContext';

type ActivityType = 'BOT' | 'SERVER' | 'COMMAND';

const typeIcons = {
  BOT: Bot,
  SERVER: Server,
  COMMAND: Command,
};

const typeColors = {
  BOT: colors.success,
  SERVER: colors.accent,
  COMMAND: colors.warning,
};

const Activity: React.FC = () => {
  const { bots, servers, runtimeStates, commandHistory } = useLarry();

  const activities = useMemo(() => {
    const serverRows = servers.map((server) => ({
      id: `server-${server.id}`,
      type: 'SERVER' as ActivityType,
      message: `${server.name} configured at ${server.host}:${server.port}`,
      timestamp: server.version ? `Version ${server.version}` : 'Auto version',
    }));

    const botRows = bots.map((bot) => ({
      id: `bot-${bot.id}`,
      type: 'BOT' as ActivityType,
      message: `${bot.name} is ${runtimeStates[bot.id]?.status || bot.status} as ${bot.mcUsername}`,
      timestamp: runtimeStates[bot.id]?.lastError || 'Runtime ready',
    }));

    const commandRows = bots.flatMap((bot) => (commandHistory[bot.id] || []).map((command, index) => ({
      id: `command-${bot.id}-${index}`,
      type: 'COMMAND' as ActivityType,
      message: `${bot.name}: ${command}`,
      timestamp: 'Recent command',
    })));

    return [...commandRows, ...botRows, ...serverRows].slice(0, 100);
  }, [bots, commandHistory, runtimeStates, servers]);

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 200ms ease-out' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.foreground, fontFamily: fonts.heading, marginBottom: '6px' }}>
            Activity
          </h1>
          <p style={{ fontSize: '15px', color: colors.foregroundMuted, margin: 0 }}>
            A compact timeline of real servers, bots, statuses, and commands.
          </p>
        </div>

        <div style={commonStyles.card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activities.map((activity) => {
              const Icon = typeIcons[activity.type];
              const iconColor = typeColors[activity.type];
              return (
                <div key={activity.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: colors.background, border: `1px solid ${colors.border}`, borderRadius: '10px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', backgroundColor: `${iconColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={iconColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: colors.foreground, marginBottom: '6px', wordWrap: 'break-word' }}>
                      {activity.message}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.foregroundMuted, fontFamily: 'monospace' }}>
                      {activity.timestamp}
                    </div>
                  </div>
                  <div style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: `${iconColor}15`, color: iconColor, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', flexShrink: 0 }}>
                    {activity.type}
                  </div>
                </div>
              );
            })}
            {activities.length === 0 && (
              <div style={{ padding: '46px 20px', textAlign: 'center', color: colors.foregroundMuted }}>
                <ActivityIcon size={36} style={{ marginBottom: '10px' }} />
                <div>No activity yet. Add a server and bot to begin.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Activity;
