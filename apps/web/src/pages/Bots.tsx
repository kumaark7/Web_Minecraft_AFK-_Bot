import React, { FormEvent, useMemo, useState } from 'react';
import { Boxes, Plus, RotateCcw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { BotCard } from '@/components/dashboard/BotCard';
import { Button } from '@/components/ui-custom/Button';
import { Input } from '@/components/ui-custom/Input';
import { Select } from '@/components/ui-custom/Select';
import { colors, commonStyles, fonts } from '@/styles/theme';
import { emptyBotForm, useLarry } from '@/AppContext';
import type { BotForm } from '@/api';

const Bots: React.FC = () => {
  const {
    servers,
    bots,
    runtimeStates,
    commandForms,
    commandHistory,
    setCommandForms,
    setError,
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
  const [botForm, setBotForm] = useState<BotForm>(emptyBotForm);
  const [serverFilter, setServerFilter] = useState('all');
  const [search, setSearch] = useState('');

  const serverOptions = [
    { value: 'all', label: 'All servers' },
    ...servers.map((server) => ({ value: server.id, label: server.name })),
  ];
  const createOptions = [
    { value: '', label: 'Select server' },
    ...servers.map((server) => ({ value: server.id, label: `${server.name} (${server.host}:${server.port})` })),
  ];

  const filteredBots = useMemo(() => {
    return bots.filter((bot) => {
      const matchesServer = serverFilter === 'all' || bot.serverId === serverFilter;
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || bot.name.toLowerCase().includes(term) || bot.mcUsername.toLowerCase().includes(term);
      return matchesServer && matchesSearch;
    });
  }, [bots, search, serverFilter]);

  async function handleCreateBot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createBot(botForm);
      setBotForm(emptyBotForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create bot');
    }
  }

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 200ms ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.foreground, fontFamily: fonts.heading, marginBottom: '6px' }}>
              Bots
            </h1>
            <p style={{ fontSize: '15px', color: colors.foregroundMuted, margin: 0 }}>
              Create bots, run commands, and control Anti AFK behavior.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button variant="success" size="sm" leftIcon={<Boxes size={14} />} onClick={() => void bulkBotAction('start-all').catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to start bots'))}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={commonStyles.card}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground, marginBottom: '14px' }}>
              New Bot
            </div>
            <form onSubmit={handleCreateBot} style={{ display: 'grid', gap: '12px' }}>
              <Select options={createOptions} value={botForm.serverId} required onChange={(event) => setBotForm({ ...botForm, serverId: event.target.value })} />
              <Input placeholder="Bot name" value={botForm.name} required onChange={(event) => setBotForm({ ...botForm, name: event.target.value })} />
              <Input placeholder="Minecraft username" value={botForm.mcUsername} minLength={3} maxLength={16} required onChange={(event) => setBotForm({ ...botForm, mcUsername: event.target.value })} />
              <Button variant="primary" type="submit" leftIcon={<Plus size={16} />} disabled={servers.length === 0}>
                Create Bot
              </Button>
            </form>
          </div>

          <div style={commonStyles.card}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground, marginBottom: '14px' }}>
              Filters
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <Select options={serverOptions} value={serverFilter} onChange={(event) => setServerFilter(event.target.value)} />
              <Input placeholder="Search bot or username" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

        {filteredBots.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: colors.foregroundMuted, border: `1px dashed ${colors.border}`, borderRadius: '12px', marginTop: '20px' }}>
            <Boxes size={40} style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>No bots found</div>
            <div style={{ fontSize: '14px' }}>Create a server first, then add your offline-mode bot username.</div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Bots;
