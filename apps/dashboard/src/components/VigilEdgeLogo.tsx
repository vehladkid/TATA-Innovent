import React from 'react';

interface VigilEdgeLogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  progress?: number;     // drives the loading animation if provided (0 to 100)
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
  // Math-aligned V-corridor dimensions (100x100 logo area, 100x145 with text)
  const outerBracketPath = "M 14 22 L 22 22 L 50 68.2 L 78 22 L 86 22 L 50 81.4 Z";
  const innerWedgePath = "M 30 22 L 70 22 L 50 55 Z";
  const cyanTrajectoryPath = "M 26 22 L 50 61.6 L 74 22";

  // Dynamic width and height scaling based on text visibility
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
        {/* Soft shadow for depth */}
        <filter id="logo-depth-shadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.85" />
        </filter>

        {/* Recessed inner shadow for metallic wedge */}
        <filter id="inner-bevel-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feOffset dx="0" dy="1" />
          <feGaussianBlur stdDeviation="0.8" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="black" floodOpacity="0.7" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>

        {/* Metal reflections and clean gray scales */}
        <linearGradient id="brushed-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#D4D4D8" />
          <stop offset="100%" stopColor="#8E8E93" />
        </linearGradient>

        <linearGradient id="matte-graphite" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2E2E33" />
          <stop offset="60%" stopColor="#1B1B1E" />
          <stop offset="100%" stopColor="#0B0B0C" />
        </linearGradient>

        {/* Polished edge profile stroke */}
        <linearGradient id="silver-polished-edge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#D4D4D8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.7" />
        </linearGradient>

        {/* Premium sweep gradient withEaseOut quintic spline curve */}
        <linearGradient id="silver-sweep-once" x1="-1.5" y1="0" x2="-0.5" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="65%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          
          {!staticMode && (
            <>
              <animate 
                attributeName="x1" 
                values="-1.5; 1.5" 
                dur="1.0s" 
                repeatCount="1" 
                fill="freeze" 
                begin="1.3s" 
                calcMode="spline" 
                keySplines="0.16 1 0.3 1" 
              />
              <animate 
                attributeName="x2" 
                values="-0.5; 2.5" 
                dur="1.0s" 
                repeatCount="1" 
                fill="freeze" 
                begin="1.3s" 
                calcMode="spline" 
                keySplines="0.16 1 0.3 1" 
              />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Main Symbol Group (Appears from darkness) */}
      <g filter="url(#logo-depth-shadow)" opacity={staticMode ? 1 : 0}>
        {!staticMode && (
          <animate 
            attributeName="opacity" 
            values="0; 1" 
            dur="0.8s" 
            repeatCount="1" 
            fill="freeze" 
            begin="0.1s" 
            calcMode="spline" 
            keySplines="0.25 1 0.5 1" 
          />
        )}

        {/* Left Panel: Outer V-Bracket (Brushed Silver) - Slides from Left */}
        <path
          d={outerBracketPath}
          fill="url(#brushed-silver)"
          stroke="url(#silver-polished-edge)"
          strokeWidth="0.8"
          style={{ transformOrigin: '50px 50px' }}
        >
          {!staticMode && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-50,0; 0,0"
              dur="1.0s"
              begin="0.1s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.16 1 0.3 1"
            />
          )}
        </path>

        {/* Right Panel: Inner Wedge (Matte Graphite Black) - Slides from Right */}
        <path
          d={innerWedgePath}
          fill="url(#matte-graphite)"
          filter="url(#inner-bevel-shadow)"
          style={{ transformOrigin: '50px 50px' }}
        >
          {!staticMode && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="50,0; 0,0"
              dur="1.0s"
              begin="0.1s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.16 1 0.3 1"
            />
          )}
        </path>

        {/* Trajectory Centerline (Subtle Cyan accent #00C8FF) - Draws after slide completes */}
        <path
          d={cyanTrajectoryPath}
          fill="none"
          stroke="#00C8FF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="90"
          strokeDashoffset={staticMode ? 0 : 90}
          opacity={staticMode ? 0.95 : 0}
        >
          {!staticMode && (
            <>
              <animate 
                attributeName="opacity" 
                values="0; 0.95" 
                dur="0.4s" 
                repeatCount="1" 
                fill="freeze" 
                begin="1.0s" 
              />
              <animate 
                attributeName="stroke-dashoffset" 
                values="90; 0" 
                dur="0.8s" 
                repeatCount="1" 
                fill="freeze" 
                begin="1.0s" 
                calcMode="spline" 
                keySplines="0.16 1 0.3 1" 
              />
            </>
          )}
        </path>

        {/* Specular Reflection Sweep Overlay */}
        <path
          d={outerBracketPath}
          fill="url(#silver-sweep-once)"
          style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}
        />
      </g>

      {/* Typography block: VIGIL EDGE & Tagline (Sora + Poppins) */}
      {showText && (
        <g>
          {/* Main Brand Title - Sora SemiBold */}
          <text
            x="50"
            y="112"
            fill="#E5E7EB"
            fontFamily="'Sora', sans-serif"
            fontWeight="600"
            fontSize="10.5"
            letterSpacing="3"
            textAnchor="middle"
            opacity={staticMode ? 1 : 0}
          >
            VIGIL EDGE
            {!staticMode && (
              <animate
                attributeName="opacity"
                values="0; 1"
                dur="0.8s"
                repeatCount="1"
                fill="freeze"
                begin="2.0s"
                calcMode="spline"
                keySplines="0.25 1 0.5 1"
              />
            )}
          </text>

          {/* Secondary Tagline - Poppins Medium */}
          <text
            x="50"
            y="130"
            fill="#9CA3AF"
            fontFamily="'Poppins', sans-serif"
            fontWeight="500"
            fontSize="4.2"
            letterSpacing="1.2"
            textAnchor="middle"
            opacity={staticMode ? 0.75 : 0}
          >
            PREDICTIVE INDUSTRIAL SAFETY OS
            {!staticMode && (
              <animate
                attributeName="opacity"
                values="0; 0.75"
                dur="0.8s"
                repeatCount="1"
                fill="freeze"
                begin="2.4s"
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
