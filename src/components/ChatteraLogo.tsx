import React from 'react';

interface ChatteraLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const ChatteraLogo: React.FC<ChatteraLogoProps> = ({
  size = 42,
  className = '',
  animated = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {animated && (
        <>
          <span
            className="absolute inset-0 rounded-[28%] opacity-35 blur-md animate-pulse"
            style={{
              background:
                'linear-gradient(135deg, #6c5ce7 0%, #21c47b 100%)',
            }}
          />
          <span
            className="absolute -inset-2 rounded-[32%] border border-[#6c5ce7]/30 animate-ping"
            style={{ animationDuration: '2.4s' }}
          />
        </>
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-sm"
      >
        <defs>
          <linearGradient
            id="chatteraPrimaryBg"
            x1="4"
            y1="4"
            x2="60"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7C5CFA" />
            <stop offset="50%" stopColor="#5B4BDB" />
            <stop offset="100%" stopColor="#311B92" />
          </linearGradient>

          <linearGradient
            id="chatteraBubbleFront"
            x1="12"
            y1="14"
            x2="48"
            y2="52"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EAE6FF" />
          </linearGradient>

          <linearGradient
            id="chatteraEmeraldWave"
            x1="20"
            y1="16"
            x2="52"
            y2="46"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#21C47B" />
            <stop offset="100%" stopColor="#00D2D3" />
          </linearGradient>
        </defs>

        {/* Outer Squircle Emblem */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="18"
          fill="url(#chatteraPrimaryBg)"
        />

        {/* Inner Glass Bevel Highlight */}
        <rect
          x="3.2"
          y="3.2"
          width="57.6"
          height="57.6"
          rx="16.8"
          stroke="white"
          strokeOpacity="0.25"
          strokeWidth="1.4"
        />

        {/* Back Emerald-Cyan Chat Bubble */}
        <path
          d="M35 14C44.3888 14 52 20.4919 52 28.5C52 32.02 50.52 35.25 48.06 37.76L50.5 44.5L43.4 41.88C40.86 42.61 38.01 43 35 43"
          fill="url(#chatteraEmeraldWave)"
          fillOpacity="0.22"
          stroke="url(#chatteraEmeraldWave)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Main Front Chat Bubble Silhouette */}
        <path
          d="M29.5 18C19.835 18 12 24.7157 12 33C12 36.86 13.7 40.38 16.48 43.03L13.8 50.5L21.95 47.55C24.28 48.49 26.83 49 29.5 49C39.165 49 47 42.2843 47 34C47 25.7157 39.165 18 29.5 18Z"
          fill="url(#chatteraBubbleFront)"
        />

        {/* Voice & Real-Time Equalizer Bars Inside Front Bubble */}
        <rect
          x="21"
          y="30"
          width="3.4"
          height="7"
          rx="1.7"
          fill="#5B4BDB"
        />
        <rect
          x="26.2"
          y="25.5"
          width="3.4"
          height="16"
          rx="1.7"
          fill="url(#chatteraEmeraldWave)"
        />
        <rect
          x="31.4"
          y="27.5"
          width="3.4"
          height="12"
          rx="1.7"
          fill="#5B4BDB"
        />
        <rect
          x="36.6"
          y="30.5"
          width="3.4"
          height="6"
          rx="1.7"
          fill="#7C5CFA"
        />

        {/* Live Presence Dot Badge */}
        <circle
          cx="49"
          cy="16"
          r="4.5"
          fill="#21C47B"
          stroke="#3D29B0"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};
