import React from 'react';

export default function LogoHexagon({ size = 28, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(0, 230, 118, 0.35))', ...style }}
    >
      <defs>
        <linearGradient id="quantumHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E676" />
          <stop offset="100%" stopColor="#29B6F6" />
        </linearGradient>
      </defs>
      {/* Hexagon Outer Glass Frame */}
      <polygon
        points="16,2 29,9.5 29,24.5 16,32 3,24.5 3,9.5"
        fill="rgba(0, 230, 118, 0.14)"
        stroke="url(#quantumHexGrad)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Rising Candlestick Bars */}
      <line x1="10" y1="18" x2="10" y2="23" stroke="#29B6F6" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="8.5" y="13" width="3" height="6" rx="1" fill="#29B6F6" />
      
      <line x1="16" y1="10" x2="16" y2="23" stroke="#00E676" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="14.5" y="12" width="3" height="8" rx="1" fill="#00E676" />

      <line x1="22" y1="7" x2="22" y2="20" stroke="#00E676" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="20.5" y="9" width="3" height="7" rx="1" fill="#00E676" />
    </svg>
  );
}
