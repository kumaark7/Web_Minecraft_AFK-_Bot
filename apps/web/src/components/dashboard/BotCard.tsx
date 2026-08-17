import React from 'react';
import {
  Activity,
  Carrot,
  Crosshair,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import { colors, commonStyles } from '@/styles/theme';
import type { BotRecord, BotRuntimeState } from '@/api';
import { Button } from '@/components/ui-custom/Button';
import { Badge } from '@/components/ui-custom/Badge';
import { Input } from '@/components/ui-custom/Input';
import { MinecraftAvatar } from '@/components/common/MinecraftAvatar';

interface BotCardProps {
  bot: BotRecord;
  runtime?: BotRuntimeState;
  command: string;
  commandHistory: string[];
  onCommandChange: (value: string) => void;
  onStart: () => void;
  onRestart: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  onToggleAntiAfk: () => void;
  onSendCommand: () => void;
}

const quickCommands = ['/spawn', '/home', '/tpaccept', '/help'];

const logColor = (line: string) => {
  if (line.includes('Error') || line.includes('Kicked')) return colors.danger;
  if (line.includes('[COMMAND]')) return colors.accent;
  if (line.includes('[CHAT]')) return colors.warning;
  if (line.includes('online') || line.includes('Login')) return colors.success;
  return colors.foreground;
};

export const BotCard: React.FC<BotCardProps> = ({
  bot,
  runtime,
  command,
  commandHistory,
  onCommandChange,
  onStart,
  onRestart,
  onStop,
  onRefresh,
  onDelete,
  onToggleAntiAfk,
  onSendCommand,
}) => {
  const status = runtime?.status || bot.status;
  const antiAfkEnabled = runtime?.antiAfkEnabled || false;
  const statusVariant = status === 'ONLINE' ? 'success' : status === 'ERROR' ? 'danger' : 'default';
  const recentLogs = runtime?.logs.slice(-5) || [];

  return (
    <div style={commonStyles.card}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <MinecraftAvatar
            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${bot.mcUsername}&backgroundColor=10b981`}
            alt={bot.name}
            size={56}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground }}>
                {bot.name}
              </span>
              <Badge variant={statusVariant as 'success' | 'danger' | 'default'}>{status}</Badge>
              <Badge variant={antiAfkEnabled ? 'success' : 'default'}>
                Anti AFK {antiAfkEnabled ? 'ON' : 'OFF'}
              </Badge>
            </div>
            <div style={{ fontSize: '13px', color: colors.foregroundMuted, marginBottom: '4px' }}>
              {bot.mcUsername}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: colors.foregroundMuted }}>
              <Crosshair size={14} />
              <span>
                {bot.server.name} - {bot.server.host}:{bot.server.port}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <StatItem
            icon={antiAfkEnabled ? <ShieldCheck size={18} color={colors.success} /> : <ShieldOff size={18} color={colors.foregroundMuted} />}
            label="Anti AFK"
            value={antiAfkEnabled ? 'Movement enabled' : 'Standing still'}
          />
          <StatItem
            icon={<Carrot size={18} color={colors.warning} />}
            label="Food"
            value="Eats when hungry"
          />
          <StatItem
            icon={<Activity size={18} color={colors.foregroundMuted} />}
            label="Reconnects"
            value={String(runtime?.reconnectAttempts || 0)}
          />
        </div>
      </div>

      <div
        style={{
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 600, color: colors.foreground, marginBottom: '12px' }}>
          Latest Logs
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {runtime?.lastError && (
            <div style={{ fontSize: '13px', color: colors.danger }}>{runtime.lastError}</div>
          )}
          {recentLogs.length === 0 && (
            <div style={{ fontSize: '13px', color: colors.foregroundMuted }}>No recent logs.</div>
          )}
          {recentLogs.map((line) => (
            <div key={line} style={{ fontSize: '12px', color: logColor(line), fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="success" size="sm" leftIcon={<Play size={14} />} onClick={onStart}>
            Start
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={14} />} onClick={onRestart}>
            Restart
          </Button>
          <Button variant={antiAfkEnabled ? 'success' : 'outline'} size="sm" leftIcon={antiAfkEnabled ? <ShieldCheck size={14} /> : <ShieldOff size={14} />} onClick={onToggleAntiAfk}>
            Anti AFK {antiAfkEnabled ? 'On' : 'Off'}
          </Button>
          <Button variant="danger" size="sm" leftIcon={<Pause size={14} />} onClick={onStop}>
            Stop
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: colors.foreground, marginBottom: '10px' }}>
          Quick Commands
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {[...quickCommands, ...commandHistory].filter((cmd, index, list) => list.indexOf(cmd) === index).slice(0, 8).map((cmd) => (
            <button
              key={cmd}
              onClick={() => onCommandChange(cmd)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.background,
                color: colors.foreground,
                fontSize: '13px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Input
            placeholder="Enter command..."
            value={command}
            onChange={(event) => onCommandChange(event.target.value)}
            style={{ flex: 1 }}
          />
          <Button variant="primary" leftIcon={<Send size={16} />} onClick={onSendCommand}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: '140px' }}>
    <div style={{ marginTop: '2px' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '12px', color: colors.foregroundMuted, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: colors.foreground }}>
        {value}
      </div>
    </div>
  </div>
);
