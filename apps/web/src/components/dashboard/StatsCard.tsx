import React from 'react';
import { colors, commonStyles } from '@/styles/theme';

interface StatsCardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  accentColor: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ icon, iconBg, value, label, accentColor }) => {
  return (
    <div style={commonStyles.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: colors.foreground }}>{value}</div>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: colors.foreground, marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: colors.foregroundMuted }}>Current status</div>
      <div
        style={{
          marginTop: '16px',
          height: '4px',
          backgroundColor: colors.muted,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '70%',
            height: '100%',
            backgroundColor: accentColor,
            borderRadius: '2px',
          }}
        />
      </div>
    </div>
  );
};
