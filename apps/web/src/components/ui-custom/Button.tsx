import React from 'react';
import { commonStyles, colors } from '@/styles/theme';

const noop = () => {};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  onClick,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '8px 16px', fontSize: '14px' },
    lg: { padding: '10px 20px', fontSize: '14px' },
  };

  const variantStyles = {
    primary: {
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
      color: colors.onPrimary,
    },
    secondary: {
      backgroundColor: colors.muted,
      color: colors.foreground,
    },
    success: {
      backgroundColor: `${colors.success}15`,
      color: colors.success,
      border: `1px solid ${colors.success}30`,
    },
    danger: {
      backgroundColor: `${colors.danger}15`,
      color: colors.danger,
      border: `1px solid ${colors.danger}30`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.foregroundMuted,
    },
    outline: {
      backgroundColor: 'transparent',
      border: `1px solid ${colors.border}`,
      color: colors.foreground,
    },
  };

  return (
    <button
      type="button"
      style={{
        ...commonStyles.button,
        ...sizeStyles[size],
        ...variantStyles[variant],
        width: fullWidth ? '100%' : 'auto',
        opacity: props.disabled ? 0.5 : 1,
        ...style,
      }}
      onClick={onClick ?? noop}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
};
