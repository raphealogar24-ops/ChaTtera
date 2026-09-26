import React from 'react';

interface ChatteraLogoProps {
  size?: number;
  className?: string;
}

export const ChatteraLogo: React.FC<ChatteraLogoProps> = ({
  size = 42,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <defs>
          <linearGradient
            id="chatteraBgGrad"
            x1="4"
            y1="4"
            x2="60"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7C5CFA" />
            <stop offset="55%" stopColor="#523BE4" />
            <stop offset="100%" stopColor="#341F97" />
          </linearGradient>

          <linearGradient
            id="chatteraAccentGrad"
            x1="18"
            y1="14"
            x2="48"
            y2="50"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0DCFF" />
          </linearGradient>

          <linearGradient
            id="chatteraPulseGrad"
            x1="26"
            y1="22"
            x2="46"
            y2="42"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#21C47B" />
            <stop offset="100%" stopColor="#00D2D3" />
          </linearGradient>
        </defs>

        {/* Outer Squircle Badge */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="18"
          fill="url(#chatteraBgGrad)"
        />

        {/* Subtle Inner Rim Highlight */}
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="17"
          stroke="white"
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />

        {/* Secondary Floating Chat Bubble Accent */}
        <path
          d="M36 15C44.8366 15 52 21.268 52 29C52 32.515 50.514 35.728 48.068 38.184L50.2 44.2L43.61 41.73C41.31 42.55 38.72 43 36 43"
          stroke="url(#chatteraPulseGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Primary Stylized 'C' Chat Bubble */}
        <path
          d="M41.5 22.5C38.7 19.7 34.7 18 30.2 18C21.25 18 14 24.94 14 33.5C14 37.32 15.44 40.82 17.84 43.52L15.5 50.5L23.15 47.72C25.32 48.55 27.7 49 30.2 49C34.9 49 39.1 47.1 42 44"
          stroke="url(#chatteraAccentGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Voice / Real-Time Acoustic Wave Bars inside the 'C' */}
        <rect
          x="24.5"
          y="29.5"
          width="3.2"
          height="8"
          rx="1.6"
          fill="#FFFFFF"
        />
        <rect
          x="30"
          y="25.5"
          width="3.2"
          height="16"
          rx="1.6"
          fill="url(#chatteraPulseGrad)"
        />
        <rect
          x="35.5"
          y="28.5"
          width="3.2"
          height="10"
          rx="1.6"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
};
