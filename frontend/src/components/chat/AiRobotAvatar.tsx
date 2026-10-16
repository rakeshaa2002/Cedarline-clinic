import { type SVGProps } from 'react'

export function AiRobotAvatar({ className = 'size-10', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Chassis Gradient - Glossy White to Slate */}
        <linearGradient id="robot-head-grad" x1="16" y1="16" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Visor Display - Deep Space Midnight */}
        <linearGradient id="robot-visor-grad" x1="20" y1="24" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        {/* Top Dome - Vibrant Warm Gold */}
        <linearGradient id="robot-yellow-grad" x1="28" y1="11" x2="36" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Antennae - Coral Pink / Red Accent */}
        <linearGradient id="robot-red-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>

        {/* Eye Neon Cyan Drop Glow */}
        <filter id="robot-eye-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="#38BDF8" floodOpacity="0.95" />
        </filter>

        {/* Chassis Soft 3D Drop Shadow */}
        <filter id="robot-chassis-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#robot-chassis-shadow)">
        {/* Top Antenna Cap */}
        <path
          d="M26 17.5C26 14.2 28.7 12 32 12C35.3 12 38 14.2 38 17.5H26Z"
          fill="url(#robot-yellow-grad)"
        />
        <rect x="25" y="16.5" width="14" height="2" rx="1" fill="#D97706" />

        {/* Left Antenna Post & Bulb */}
        <rect x="11.5" y="23" width="2" height="11" rx="1" fill="url(#robot-red-grad)" />
        <circle cx="12.5" cy="22" r="3" fill="url(#robot-red-grad)" />
        <circle cx="11.5" cy="21" r="1" fill="#FFFFFF" fillOpacity="0.6" />
        {/* Left Ear Cup */}
        <rect x="12" y="29.5" width="3.5" height="9" rx="1.75" fill="url(#robot-red-grad)" />

        {/* Right Antenna Post & Bulb */}
        <rect x="50.5" y="23" width="2" height="11" rx="1" fill="url(#robot-red-grad)" />
        <circle cx="51.5" cy="22" r="3" fill="url(#robot-red-grad)" />
        <circle cx="50.5" cy="21" r="1" fill="#FFFFFF" fillOpacity="0.6" />
        {/* Right Ear Cup */}
        <rect x="48.5" y="29.5" width="3.5" height="9" rx="1.75" fill="url(#robot-red-grad)" />

        {/* Main Head Chassis */}
        <rect
          x="14"
          y="17"
          width="36"
          height="32"
          rx="13"
          fill="url(#robot-head-grad)"
          stroke="#F8FAFC"
          strokeWidth="1"
        />

        {/* Visor Display Screen */}
        <rect
          x="18.5"
          y="23.5"
          width="27"
          height="19"
          rx="8"
          fill="url(#robot-visor-grad)"
          stroke="#0F172A"
          strokeWidth="0.75"
        />

        {/* Visor Top Curved Glass Reflection */}
        <path
          d="M21 25.5C21 25.5 25 24.5 32 24.5C39 24.5 43 25.5 43 25.5C40 27.2 36 27.8 32 27.8C28 27.8 24 27.2 21 25.5Z"
          fill="#FFFFFF"
          fillOpacity="0.28"
        />

        {/* Glowing Cyan LED Eyes */}
        <g filter="url(#robot-eye-glow)">
          <rect x="23.5" y="29" width="5.5" height="7.5" rx="2.75" fill="#38BDF8" />
          <rect x="35" y="29" width="5.5" height="7.5" rx="2.75" fill="#38BDF8" />
          {/* Eye Pupils / Highlights */}
          <circle cx="25.5" cy="31" r="1" fill="#FFFFFF" />
          <circle cx="37" cy="31" r="1" fill="#FFFFFF" />
        </g>

        {/* Subtle Cute Mouth Line */}
        <rect x="28.5" y="42.5" width="7" height="1.75" rx="0.875" fill="#64748B" />

        {/* Chin Seam Highlight */}
        <path
          d="M25 47C27.5 47.7 36.5 47.7 39 47"
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
