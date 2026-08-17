import React from 'react';
import { commonStyles } from '@/styles/theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ icon, style, ...props }) => {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      {icon && (
        <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      <input
        style={{
          ...commonStyles.input,
          width: '100%',
          paddingLeft: icon ? '36px' : '12px',
          ...style,
        }}
        {...props}
      />
    </div>
  );
};
