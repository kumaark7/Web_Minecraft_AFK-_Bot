import React from 'react';
import { colors, commonStyles } from '@/styles/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'default' | 'primary';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const variantStyles = {
    success: {
      backgroundColor: `${colors.success}20`,
      color: colors.success,
    },
    danger: {
      backgroundColor: `${colors.danger}20`,
      color: colors.danger,
    },
    warning: {
      backgroundColor: `${colors.warning}20`,
      color: colors.warning,
    },
    default: {
      backgroundColor: colors.muted,
      color: colors.foregroundMuted,
    },
    primary: {
      backgroundColor: `${colors.primary}20`,
      color: colors.primaryLight,
    },
  };

  return (
    <span style={{ ...commonStyles.badge, ...variantStyles[variant] }}>
      {children}
    </span>
  );
};
