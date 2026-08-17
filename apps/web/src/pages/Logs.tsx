import React, { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Input } from '@/components/ui-custom/Input';
import { Select } from '@/components/ui-custom/Select';
import { colors, commonStyles, fonts } from '@/styles/theme';
import { useLarry } from '@/AppContext';

type LogTag = 'CHAT' | 'COMMAND' | 'SYSTEM' | 'ERROR';

type LogRow = {
  id: string;
  timestamp: string;
  botName: string;
  tag: LogTag;
  message: string;
};

const tagColors: Record<LogTag, string> = {
  CHAT: colors.warning,
  COMMAND: colors.accent,
  SYSTEM: colors.foregroundMuted,
  ERROR: colors.danger,
};

const Logs: React.FC = () => {
  const { bots, runtimeStates, commandHistory } = useLarry();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  const rows = useMemo<LogRow[]>(() => {
    const runtimeRows = bots.flatMap((bot) => {
      const runtime = runtimeStates[bot.id];
      return (runtime?.logs || []).map((line, index) => ({
        id: `${bot.id}-runtime-${index}`,
        timestamp: line.match(/^\S+/)?.[0] || '-',
        botName: bot.name,
        tag: line.toLowerCase().includes('error') ? ('ERROR' as const) : ('SYSTEM' as const),
        message: line,
      }));
    });

    const commandRows = bots.flatMap((bot) => {
      return (commandHistory[bot.id] || []).map((command, index) => ({
        id: `${bot.id}-command-${index}`,
        timestamp: 'recent',
        botName: bot.name,
        tag: 'COMMAND' as const,
        message: command,
      }));
    });

    return [...commandRows, ...runtimeRows].slice(0, 300);
  }, [bots, commandHistory, runtimeStates]);

  const tagOptions = [
    { value: 'all', label: 'All types' },
    { value: 'CHAT', label: 'CHAT' },
    { value: 'COMMAND', label: 'COMMAND' },
    { value: 'SYSTEM', label: 'SYSTEM' },
    { value: 'ERROR', label: 'ERROR' },
  ];

  const filteredRows = rows.filter((row) => {
    const term = search.toLowerCase();
    const matchesSearch = row.message.toLowerCase().includes(term) || row.botName.toLowerCase().includes(term);
    const matchesTag = tagFilter === 'all' || row.tag === tagFilter;
    return matchesSearch && matchesTag;
  });

  return (
    <Layout>
      <div style={{ animation: 'fadeIn 200ms ease-out' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.foreground, fontFamily: fonts.heading, marginBottom: '6px' }}>
            Logs
          </h1>
          <p style={{ fontSize: '15px', color: colors.foregroundMuted, margin: 0 }}>
            Runtime logs refresh every few seconds after commands and bot actions.
          </p>
        </div>

        <div style={commonStyles.card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <Input placeholder="Search logs..." value={search} onChange={(event) => setSearch(event.target.value)} icon={<Search size={16} color={colors.foregroundMuted} />} />
            <Select options={tagOptions} value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th style={tableHeaderStyle}>Time</th>
                  <th style={tableHeaderStyle}>Bot</th>
                  <th style={tableHeaderStyle}>Tag</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'left' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={tableCellMuted}>{row.timestamp}</td>
                    <td style={{ padding: '14px 12px', fontSize: '13px', color: colors.foreground }}>{row.botName}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: `${tagColors[row.tag]}20`, color: tagColors[row.tag], fontSize: '11px', fontWeight: 700 }}>
                        {row.tag}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: '14px', color: colors.foreground }}>{row.message}</td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: colors.foregroundMuted }}>
                      <FileText size={34} style={{ marginBottom: '10px' }} />
                      <div>No logs yet. Start a bot or send a command.</div>
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

const tableCellMuted: React.CSSProperties = {
  padding: '14px 12px',
  fontSize: '13px',
  color: colors.foregroundMuted,
  fontFamily: 'monospace',
};

export default Logs;
