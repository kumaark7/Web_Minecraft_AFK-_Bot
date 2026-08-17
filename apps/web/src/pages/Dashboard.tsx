import React, { FormEvent, useMemo, useState } from 'react';
import {
  Activity,
  Edit,
  Plus,
  RotateCcw,
  Server,
  Terminal,
  Trash2,
  Users,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui-custom/Button';
import { Badge } from '@/components/ui-custom/Badge';
import { Input } from '@/components/ui-custom/Input';
import { Select } from '@/components/ui-custom/Select';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { BotCard } from '@/components/dashboard/BotCard';
import { MinecraftAvatar } from '@/components/common/MinecraftAvatar';
import { colors, commonStyles, fonts } from '@/styles/theme';
import { emptyBotForm, emptyServerForm, useLarry } from '@/AppContext';
import type { BotForm, ServerForm, ServerRecord } from '@/api';

const Dashboard: React.FC = () => {
  const {
    user,
    servers,
    bots,
    runtimeStates,
    commandForms,
    commandHistory,
    message,
    error,
    setCommandForms,
    setError,
    saveServer,
    deleteServer,
    createBot,
    startBot,
    stopBot,
    restartBot,
    deleteBot,
    toggleAntiAfk,
    sendCommand,
    loadBotRuntime,
    bulkBotAction,
  } = useLarry();
  const [serverFilter, setServerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [serverForm, setServerForm] = useState<ServerForm>(emptyServerForm);
  const [botForm, setBotForm] = useState<BotForm>(emptyBotForm);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

  const onlineBots = bots.filter((bot) => runtimeStates[bot.id]?.status === 'ONLINE' || bot.status === 'ONLINE').length;
  const commandCount = Object.values(commandHistory).reduce((total, entries) => total + entries.length, 0);
  const filteredBots = useMemo(() => {
    return bots.filter((bot) => {
      const matchesServer = serverFilter === 'all' || bot.serverId === serverFilter;
      const matchesSearch =
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.mcUsername.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesServer && matchesSearch;
    });
  }, [bots, serverFilter, searchQuery]);

  const serverOptions = [
    { value: 'all', label: 'All Servers' },
    ...servers.map((server) => ({ value: server.id, label: server.name })),
  ];
  const botServerOptions = [
    { value: '', label: 'Select server' },
    ...servers.map((server) => ({ value: server.id, label: `${server.name} (${server.host}:${server.port})` })),
  ];

  async function handleServerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveServer(serverForm, editingServerId);
      setServerForm(emptyServerForm);
      setEditingServerId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save server');
    }
  }

  async function handleBotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createBot(botForm);
      setBotForm(emptyBotForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create bot');
    }
  }

  function startEditing(server: ServerRecord) {
    setEditingServerId(server.id);
    setServerForm({
      name: server.name,
      host: server.host,
      port: String(server.port),
      version: server.version || '',
    });
  }

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 200ms ease-out' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: colors.foreground,
                fontFamily: fonts.heading,
                marginBottom: '6px',
              }}
            >
              Welcome back, {user?.username || 'operator'}
            </h1>
            <p style={{ fontSize: '15px', color: colors.foregroundMuted, margin: 0 }}>
              Manage cracked/offline-mode Minecraft bots from one lightweight panel.
            </p>
          </div>
          <Badge variant="success">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: colors.success,
                marginRight: 8,
                display: 'inline-block',
              }}
            />
            API online
          </Badge>
        </div>

        {(message || error) && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: error ? colors.danger : colors.success,
              backgroundColor: error ? `${colors.danger}15` : `${colors.success}15`,
              border: `1px solid ${error ? `${colors.danger}30` : `${colors.success}30`}`,
            }}
          >
            {error || message}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <StatsCard
            icon={<Server size={22} color={colors.primaryLight} />}
            iconBg={`${colors.primary}20`}
            value={servers.length}
            label="Servers"
            accentColor={colors.primary}
          />
          <StatsCard
            icon={<Users size={22} color={colors.success} />}
            iconBg={`${colors.success}20`}
            value={onlineBots}
            label="Bots Online"
            accentColor={colors.success}
          />
          <StatsCard
            icon={<Terminal size={22} color={colors.warning} />}
            iconBg={`${colors.warning}20`}
            value={commandCount}
            label="Recent Commands"
            accentColor={colors.warning}
          />
          <StatsCard
            icon={<Activity size={22} color={colors.accent} />}
            iconBg={`${colors.accent}20`}
            value={bots.length}
            label="Total Bots"
            accentColor={colors.accent}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground }}>Servers</div>
                <div style={{ fontSize: '13px', color: colors.foregroundMuted, marginTop: '2px' }}>
                  {servers.length} saved offline-mode server{servers.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <form onSubmit={handleServerSubmit} style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
              <Input placeholder="Server name" value={serverForm.name} required onChange={(event) => setServerForm({ ...serverForm, name: event.target.value })} />
              <Input placeholder="Host / IP" value={serverForm.host} required onChange={(event) => setServerForm({ ...serverForm, host: event.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input placeholder="Port" type="number" min={1} max={65535} value={serverForm.port} required onChange={(event) => setServerForm({ ...serverForm, port: event.target.value })} />
                <Input placeholder="Version, e.g. 1.21.11" value={serverForm.version} onChange={(event) => setServerForm({ ...serverForm, version: event.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button variant="primary" type="submit" leftIcon={<Plus size={14} />}>
                  {editingServerId ? 'Update Server' : 'Add Server'}
                </Button>
                {editingServerId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingServerId(null);
                      setServerForm(emptyServerForm);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {servers.length === 0 && (
                <div style={{ color: colors.foregroundMuted, fontSize: '13px' }}>No servers configured.</div>
              )}
              {servers.map((server) => (
                <div
                  key={server.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                  }}
                >
                  <MinecraftAvatar
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${server.id}&backgroundColor=1e293b`}
                    alt={server.name}
                    size={40}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: colors.foreground }}>
                        {server.name}
                      </span>
                      <Badge variant="success">OFFLINE MODE</Badge>
                    </div>
                    <div style={{ fontSize: '12px', color: colors.foregroundMuted }}>
                      {server.host}:{server.port}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      backgroundColor: colors.muted,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: colors.foreground,
                    }}
                  >
                    {server.version || 'auto'}
                  </div>
                  <Button variant="secondary" size="sm" leftIcon={<Edit size={14} />} onClick={() => startEditing(server)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void deleteServer(server.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to delete server'))}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div style={commonStyles.card}>
            <div style={commonStyles.cardHeader}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground }}>Create Bot</div>
                <div style={{ fontSize: '13px', color: colors.foregroundMuted, marginTop: '2px' }}>
                  Add an offline-mode Minecraft username.
                </div>
              </div>
            </div>

            <form onSubmit={handleBotSubmit} style={{ display: 'grid', gap: '12px' }}>
              <Select options={botServerOptions} value={botForm.serverId} required onChange={(event) => setBotForm({ ...botForm, serverId: event.target.value })} />
              <Input placeholder="Bot name" value={botForm.name} required onChange={(event) => setBotForm({ ...botForm, name: event.target.value })} />
              <Input placeholder="Minecraft username" value={botForm.mcUsername} minLength={3} maxLength={16} required onChange={(event) => setBotForm({ ...botForm, mcUsername: event.target.value })} />
              <Button variant="primary" type="submit" leftIcon={<Plus size={16} />} disabled={servers.length === 0}>
                Create Bot
              </Button>
            </form>
          </div>
        </div>

        <div style={commonStyles.card}>
          <div style={{ ...commonStyles.cardHeader, marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground }}>
                <Activity size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Bots
              </div>
              <div style={{ fontSize: '13px', color: colors.foregroundMuted, marginTop: '2px' }}>
                Start, stop, command, and toggle Anti AFK.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="success" size="sm" leftIcon={<Activity size={14} />} onClick={() => void bulkBotAction('start-all').catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to start bots'))}>
                Start All
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={14} />} onClick={() => void bulkBotAction('restart-all').catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to restart bots'))}>
                Restart All
              </Button>
              <Button variant="danger" size="sm" onClick={() => void bulkBotAction('stop-all').catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to stop bots'))}>
                Stop All
              </Button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: colors.foregroundMuted, marginBottom: '6px' }}>
                Server
              </label>
              <Select options={serverOptions} value={serverFilter} onChange={(event) => setServerFilter(event.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: colors.foregroundMuted, marginBottom: '6px' }}>
                Bot Name
              </label>
              <Input
                placeholder="Search bots..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredBots.length === 0 && (
              <div style={{ color: colors.foregroundMuted, fontSize: '14px' }}>No bots found.</div>
            )}
            {filteredBots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                runtime={runtimeStates[bot.id]}
                command={commandForms[bot.id] || ''}
                commandHistory={commandHistory[bot.id] || []}
                onCommandChange={(value) => setCommandForms((current) => ({ ...current, [bot.id]: value }))}
                onStart={() => void startBot(bot.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to start bot'))}
                onRestart={() => void restartBot(bot.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to restart bot'))}
                onStop={() => void stopBot(bot.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to stop bot'))}
                onRefresh={() => void loadBotRuntime(bot.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to refresh bot'))}
                onDelete={() => void deleteBot(bot.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to delete bot'))}
                onToggleAntiAfk={() => void toggleAntiAfk(bot.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to toggle Anti AFK'))}
                onSendCommand={() => void sendCommand(bot.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to send command'))}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.border}`,
              fontSize: '13px',
              color: colors.foregroundMuted,
              textAlign: 'right',
            }}
          >
            Showing {filteredBots.length} of {bots.length} bots
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
