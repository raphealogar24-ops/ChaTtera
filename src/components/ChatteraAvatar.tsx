import React, { useState } from 'react';

interface ChatteraAvatarProps {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  storyRing?: boolean;
  className?: string;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #5b4bdb, #8c7ae6)',
  'linear-gradient(135deg, #00b894, #00cec9)',
  'linear-gradient(135deg, #e17055, #fdcb6e)',
  'linear-gradient(135deg, #0984e3, #74b9ff)',
  'linear-gradient(135deg, #6c5ce7, #fd79a8)',
  'linear-gradient(135deg, #2d3436, #636e72)',
];

function getGradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const ChatteraAvatar: React.FC<ChatteraAvatarProps> = ({
  name,
  src,
  size = 54,
  online = false,
  storyRing = false,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const innerSize = storyRing ? size - 6 : size;

  const avatarContent =
    src && !imgFailed ? (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          objectFit: 'cover',
          border: storyRing ? '2px solid var(--card)' : undefined,
        }}
        className="block shrink-0"
      />
    ) : (
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          background: getGradientForName(name),
          border: storyRing ? '2px solid var(--card)' : undefined,
          fontSize: Math.max(12, Math.floor(innerSize * 0.36)),
        }}
        className="flex items-center justify-center text-white font-bold select-none shrink-0"
        aria-label={name}
      >
        {getInitials(name)}
      </div>
    );

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {storyRing ? (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            padding: 2,
            background: 'linear-gradient(135deg, #5b4bdb, #a98cff)',
          }}
          className="flex items-center justify-center"
        >
          {avatarContent}
        </div>
      ) : (
        avatarContent
      )}

      {online && (
        <span
          style={{
            width: 12,
            height: 12,
            background: 'var(--online)',
            border: '2px solid var(--card)',
            borderRadius: '50%',
            position: 'absolute',
            right: 1,
            bottom: 2,
          }}
          title="Online"
        />
      )}
    </div>
  );
};
