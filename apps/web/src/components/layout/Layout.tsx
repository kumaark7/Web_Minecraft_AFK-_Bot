import React, { useState } from 'react';
import { X } from 'lucide-react';
import { colors, commonStyles } from '@/styles/theme';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div style={commonStyles.pageContainer}>
      <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div>
          <Sidebar />
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: '#0F172A',
              zIndex: 60,
              borderRight: `1px solid ${colors.border}`,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '16px',
              }}
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: colors.foreground,
                  cursor: 'pointer',
                }}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <Sidebar />
          </div>
        </>
      )}

      <main style={commonStyles.mainContent}>{children}</main>
    </div>
  );
};
