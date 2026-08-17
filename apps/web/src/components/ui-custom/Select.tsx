import React from 'react';
import { ChevronDown } from 'lucide-react';
import { colors, commonStyles } from '@/styles/theme';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({ options, style, ...props }) => {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <select
        style={{
          ...commonStyles.input,
          width: '100%',
          appearance: 'none',
          paddingRight: '36px',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        color={colors.foregroundMuted}
        style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }}
      />
    </div>
  );
};
