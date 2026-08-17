import React, { FormEvent, useState } from 'react';
import { Edit, Plus, Server, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui-custom/Button';
import { Badge } from '@/components/ui-custom/Badge';
import { Input } from '@/components/ui-custom/Input';
import { MinecraftAvatar } from '@/components/common/MinecraftAvatar';
import { colors, commonStyles, fonts } from '@/styles/theme';
import { emptyServerForm, useLarry } from '@/AppContext';
import type { ServerForm, ServerRecord } from '@/api';

const Servers: React.FC = () => {
  const { servers, bots, saveServer, deleteServer, setError } = useLarry();
  const [form, setForm] = useState<ServerForm>(emptyServerForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveServer(form, editingId);
      setForm(emptyServerForm);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save server');
    }
  }

  function startEditing(server: ServerRecord) {
    setEditingId(server.id);
    setForm({
      name: server.name,
      host: server.host,
      port: String(server.port),
      version: server.version || '',
    });
  }

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 200ms ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.foreground, fontFamily: fonts.heading, marginBottom: '6px' }}>
              Servers
            </h1>
            <p style={{ fontSize: '15px', color: colors.foregroundMuted, margin: 0 }}>
              Save the Aternos address and port exactly as shown in the server panel.
            </p>
          </div>
        </div>

        <div style={{ ...commonStyles.card, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Server size={20} color={colors.primaryLight} />
            <div style={{ fontSize: '18px', fontWeight: 600, color: colors.foreground }}>
              {editingId ? 'Update Server' : 'Add Server'}
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <Input placeholder="Name" value={form.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input placeholder="Host / IP" value={form.host} required onChange={(event) => setForm({ ...form, host: event.target.value })} />
            <Input placeholder="Port" type="number" min={1} max={65535} value={form.port} required onChange={(event) => setForm({ ...form, port: event.target.value })} />
            <Input placeholder="Version, e.g. 1.21.11" value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} />
            <Button variant="primary" type="submit" leftIcon={<Plus size={16} />}>
              {editingId ? 'Update' : 'Add'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={() => {
                setEditingId(null);
                setForm(emptyServerForm);
              }}>
                Cancel
              </Button>
            )}
          </form>
        </div>

        <div style={commonStyles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th style={tableHeaderStyle}>Server</th>
                  <th style={tableHeaderStyle}>Mode</th>
                  <th style={tableHeaderStyle}>Version</th>
                  <th style={tableHeaderStyle}>Bots</th>
                  <th style={tableHeaderStyle}>Address</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => (
                  <tr key={server.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <MinecraftAvatar src={`https://api.dicebear.com/7.x/identicon/svg?seed=${server.id}&backgroundColor=1e293b`} alt={server.name} size={36} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.foreground }}>
                          {server.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <Badge variant="success">OFFLINE MODE</Badge>
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: colors.foreground }}>
                      {server.version || 'auto'}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: colors.foreground }}>
                      {bots.filter((bot) => bot.serverId === server.id).length}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: colors.foregroundMuted }}>
                      {server.host}:{server.port}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button variant="secondary" size="sm" leftIcon={<Edit size={14} />} onClick={() => startEditing(server)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void deleteServer(server.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to delete server'))}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {servers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: colors.foregroundMuted }}>
                      No servers configured. Add one to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '12px',
  fontWeight: 600,
  color: colors.foregroundMuted,
  textTransform: 'uppercase',
  letterSpacing: 0,
  textAlign: 'left',
};

export default Servers;
