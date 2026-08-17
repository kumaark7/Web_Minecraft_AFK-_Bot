import React from 'react';

interface MinecraftAvatarProps {
  src: string;
  alt: string;
  size?: number;
  style?: React.CSSProperties;
}

export const MinecraftAvatar: React.FC<MinecraftAvatarProps> = ({ src, alt, size = 40, style }) => {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        objectFit: 'cover',
        imageRendering: 'pixelated' as const,
        ...style,
      }}
    />
  );
};
