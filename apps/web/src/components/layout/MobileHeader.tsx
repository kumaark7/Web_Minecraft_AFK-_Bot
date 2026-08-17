import React from 'react';
import { Menu, Boxes } from 'lucide-react';
import { colors, fonts } from '@/styles/theme';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick }) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: '#0F172A',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Boxes size={20} color={colors.onPrimary} />
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: fonts.heading }}>
          LARRY CONTROL
        </div>
      </div>
      <button
        onClick={onMenuClick}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: colors.foreground,
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>
    </header>
  );
};
