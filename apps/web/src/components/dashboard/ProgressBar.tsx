import React from 'react';
import { colors } from '@/styles/theme';

interface ProgressBarProps {
  value: number;
  max: number;
  color: string;
  segments?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color, segments = 10 }) => {
  const ratio = Math.max(0, Math.min(1, value / max));
  const filledSegments = Math.round(ratio * segments);

  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '2px',
            backgroundColor: i < filledSegments ? color : `${colors.border}`,
          }}
        />
      ))}
    </div>
  );
};
