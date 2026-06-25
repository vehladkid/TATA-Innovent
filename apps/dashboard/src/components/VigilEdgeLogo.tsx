import React from 'react';

interface VigilEdgeLogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  progress?: number;     // drives loading animation if provided
  staticMode?: boolean;   // if true, disables animations and displays resolved logo
  showText?: boolean;     // if true, displays VIGIL EDGE text + tagline
}

export const VigilEdgeLogo: React.FC<VigilEdgeLogoProps> = ({
  size = 40,
  className = '',
  style = {},
  staticMode = false,
  showText = false,
}) => {
  const svgWidth = size;
  const svgHeight = typeof size === 'number' ? (showText ? size * 1.45 : size) : size;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={showText ? "0 0 100 145" : "0 0 100 100"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`vigil-edge-brand-mark ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        shapeRendering: 'geometricPrecision',
        ...style,
      }}
    >
      <defs>
        {/* Simple drop shadow for subtle depth, no glow */}
        <filter id="logo-boardroom-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.95" />
        </filter>

        {/* Brushed Silver/Grey */}
        <linearGradient id="brushed-silver-logo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#D8D8D8" />
          <stop offset="100%" stopColor="#D8D8D8" />
        </linearGradient>

        {/* Subtle reflection sweep (silver shimmer) */}
        <linearGradient id="silver-reflection-sweep" x1="-1.5" y1="0" x2="-0.5" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          
          {!staticMode && (
            <>
              <animate 
                attributeName="x1" 
                values="-1.5; 1.5" 
                dur="1.5s" 
                repeatCount="1" 
                fill="freeze" 
                begin="0.5s" 
                calcMode="spline" 
                keySplines="0.16 1 0.3 1" 
              />
              <animate 
                attributeName="x2" 
                values="-0.5; 2.5" 
                dur="1.5s" 
                repeatCount="1" 
                fill="freeze" 
                begin="0.5s" 
                calcMode="spline" 
                keySplines="0.16 1 0.3 1" 
              />
            </>
          )}
        </linearGradient>

        {/* Low-saturation Turquoise radar sweep */}
        <linearGradient id="radar-sweep-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5ACDD9" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5ACDD9" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g filter="url(#logo-boardroom-shadow)" opacity={staticMode ? 1 : 0}>
        {!staticMode && (
          <animate 
            attributeName="opacity" 
            values="0; 1" 
            dur="0.5s" 
            repeatCount="1" 
            fill="freeze" 
            begin="0.05s" 
            calcMode="spline" 
            keySplines="0.25 1 0.5 1" 
          />
        )}

        {/* 1. Radar Sweep Wedge (very low opacity) */}
        <path
          d="M 50 50 L 50 18 A 32 32 0 0 1 82 50 Z"
          fill="url(#radar-sweep-glow)"
          style={{ transformOrigin: '50px 50px' }}
        >
          {!staticMode && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="8s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* 2. Concentric Target Reticle Rings (Grey/Silver) */}
        <circle cx="50" cy="50" r="32" stroke="url(#brushed-silver-logo)" strokeWidth="0.8" strokeDasharray="1, 4" opacity="0.5" />
        <circle cx="50" cy="50" r="22" stroke="url(#brushed-silver-logo)" strokeWidth="0.6" opacity="0.3" />
        <circle cx="50" cy="50" r="12" stroke="url(#brushed-silver-logo)" strokeWidth="0.5" strokeDasharray="1, 3" opacity="0.2" />

        {/* 3. Protective Perimeter Brackets (Silver/Grey) */}
        {/* Top-Left */}
        <path d="M 22 34 L 22 22 L 34 22" stroke="url(#brushed-silver-logo)" strokeWidth="2.0" strokeLinecap="square" strokeLinejoin="miter" />
        {/* Top-Right */}
        <path d="M 66 22 L 78 22 L 78 34" stroke="url(#brushed-silver-logo)" strokeWidth="2.0" strokeLinecap="square" strokeLinejoin="miter" />
        {/* Bottom-Left */}
        <path d="M 22 66 L 22 78 L 34 78" stroke="url(#brushed-silver-logo)" strokeWidth="2.0" strokeLinecap="square" strokeLinejoin="miter" />
        {/* Bottom-Right */}
        <path d="M 66 78 L 78 78 L 78 66" stroke="url(#brushed-silver-logo)" strokeWidth="2.0" strokeLinecap="square" strokeLinejoin="miter" />

        {/* Reflection shimmer sweep */}
        <g style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}>
          <path d="M 22 34 L 22 22 L 34 22 M 66 22 L 78 22 L 78 34 M 22 66 L 22 78 L 34 78 M 66 78 L 78 78 L 78 66" stroke="url(#silver-reflection-sweep)" strokeWidth="2.0" fill="none" />
        </g>

        {/* 4. Center reticle point (Turquoise) */}
        <circle cx="50" cy="50" r="3" fill="#5ACDD9" opacity="0.8" />

        {/* 5. Predictive Trajectory Vector (Blue & Turquoise) */}
        <path
          d="M 26 74 L 42 58 M 58 42 L 70 30 L 74 34 M 70 30 L 60 28"
          fill="none"
          stroke="#3E6AE0" // Secondary Blue
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="60"
          strokeDashoffset={staticMode ? 0 : 60}
        >
          {!staticMode && (
            <animate 
              attributeName="stroke-dashoffset" 
              values="60; 0" 
              dur="1.4s" 
              repeatCount="1" 
              fill="freeze" 
              begin="0.4s" 
              calcMode="spline" 
              keySplines="0.16 1 0.3 1" 
            />
          )}
        </path>
        <path
          d="M 42 58 L 50 50 L 58 42"
          fill="none"
          stroke="#5ACDD9" // Primary Turquoise Accent
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="20"
          strokeDashoffset={staticMode ? 0 : 20}
        >
          {!staticMode && (
            <animate 
              attributeName="stroke-dashoffset" 
              values="20; 0" 
              dur="0.8s" 
              repeatCount="1" 
              fill="freeze" 
              begin="1.2s" 
              calcMode="spline" 
              keySplines="0.16 1 0.3 1" 
            />
          )}
        </path>
      </g>

      {/* Typography group (Loaded from CSS styles) */}
      {showText && (
        <g>
          {/* Main Title - VIGIL EDGE using Equinox font */}
          <text
            x="50"
            y="114"
            fill="#D8D8D8" // Grey primary text
            fontFamily="var(--font-logo)" // Equinox
            fontWeight="700"
            fontSize="13"
            letterSpacing="4.5"
            textAnchor="middle"
            opacity={staticMode ? 1 : 0}
          >
            VIGIL EDGE
            {!staticMode && (
              <animate
                attributeName="opacity"
                values="0; 1"
                dur="0.5s"
                repeatCount="1"
                fill="freeze"
                begin="1.0s"
                calcMode="spline"
                keySplines="0.25 1 0.5 1"
              />
            )}
          </text>

          {/* Subtitle - PREDICTIVE INDUSTRIAL SAFETY OS using Deltha */}
          <text
            x="50"
            y="131"
            fill="#D8D8D8" // Grey secondary text
            fontFamily="var(--font-header)" // Deltha
            fontWeight="600"
            fontSize="4.5"
            letterSpacing="1.2"
            textAnchor="middle"
            opacity={staticMode ? 0.75 : 0}
          >
            PREDICTIVE INDUSTRIAL SAFETY OS
            {!staticMode && (
              <animate
                attributeName="opacity"
                values="0; 0.75"
                dur="0.5s"
                repeatCount="1"
                fill="freeze"
                begin="1.3s"
                calcMode="spline"
                keySplines="0.25 1 0.5 1"
              />
            )}
          </text>
        </g>
      )}
    </svg>
  );
};
