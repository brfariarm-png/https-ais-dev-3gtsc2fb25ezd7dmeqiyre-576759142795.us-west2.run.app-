import React from 'react';

interface SupremeLogoProps {
  className?: string;
  size?: number;
  withTextShadow?: boolean;
}

export default function SupremeLogo({ className = '', size = 120, withTextShadow = false }: SupremeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
    >
      <defs>
        {/* Shadow for modern depth */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
        </filter>
        <filter id="ribbonShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main Container Shadow Group */}
      <g filter="url(#logoShadow)">
        {/* 1. Black Circle Backdrop */}
        <circle cx="250" cy="250" r="190" fill="#111111" />

        {/* 2. Outer Circular Bold Crimson Border */}
        <circle cx="250" cy="250" r="195" stroke="#E11D48" strokeWidth="14" fill="none" />

        {/* 3. Inner Delicate White Line Circle */}
        <circle cx="250" cy="250" r="177" stroke="#FFFFFF" strokeWidth="3.5" fill="none" opacity="0.95" />

        {/* 4. Elegant Top Royal Flourish / Ornament */}
        <g stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9">
          {/* Central ornament floral structure */}
          <path d="M 250,96 Q 256,112 266,110 M 250,96 Q 244,112 234,110" />
          <path d="M 250,111 C 259,103 268,111 278,110 C 263,115 255,111 250,115 C 245,111 237,115 222,110 C 232,111 241,103 250,111" fill="#FFFFFF" />
          {/* Small silver pearl */}
          <circle cx="250" cy="95" r="2.5" fill="#FFFFFF" />
          <circle cx="230" cy="110" r="1.5" fill="#FFFFFF" />
          <circle cx="270" cy="110" r="1.5" fill="#FFFFFF" />
        </g>

        {/* 5. Brand text "SORVETERIA" & "GOURMET" inside the circle top */}
        <text
          x="250"
          y="180"
          fontFamily="'Inter', 'Space Grotesk', 'Montserrat', sans-serif"
          fontSize="40"
          fontWeight="900"
          fill="#FFFFFF"
          textAnchor="middle"
          letterSpacing="2.5"
          className="tracking-wider uppercase"
        >
          SORVETERIA
        </text>
        <text
          x="250"
          y="222"
          fontFamily="'Inter', 'Space Grotesk', 'Montserrat', sans-serif"
          fontSize="24"
          fontWeight="900"
          fill="#FFFFFF"
          textAnchor="middle"
          letterSpacing="4"
          className="tracking-widest uppercase"
        >
          GOURMET
        </text>

        {/* 6. Crimson Red Folded Ribbon (Back layer split paths to give 3D depth) */}
        {/* Left Side Ribbon Tail Banner */}
        <path
          d="M 68,266 L 15,266 L 38,293 L 15,319 L 68,319 Z"
          fill="#BE123C"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Left Side 3D shadow fold element */}
        <path d="M 68,319 L 68,335 L 82,319 Z" fill="#4C0519" />

        {/* Right Side Ribbon Tail Banner */}
        <path
          d="M 432,266 L 485,266 L 462,293 L 485,319 L 432,319 Z"
          fill="#BE123C"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Right Side 3D shadow fold element */}
        <path d="M 432,319 L 432,335 L 418,319 Z" fill="#4C0519" />

        {/* 7. Front Main Ribbon Body overlapping the backdrop and side wings */}
        <g filter="url(#ribbonShadow)">
          <rect
            x="64"
            y="254"
            width="372"
            height="65"
            fill="#E11D48"
            stroke="#FFFFFF"
            strokeWidth="4"
            rx="4"
          />
        </g>

        {/* 8. Script Brand text: "Supreme" beautifully angled on red ribbon */}
        <text
          x="250"
          y="302"
          fontFamily="'Playfair Display', 'Brush Script MT', 'Georgia', 'Times New Roman', serif"
          fontSize="54"
          fontWeight="900"
          fontStyle="italic"
          fill="#FFFFFF"
          textAnchor="middle"
          style={{ textShadow: withTextShadow ? '0px 2px 4px rgba(0,0,0,0.15)' : 'none' }}
        >
          Supreme
        </text>

        {/* 9. Minimalist Soft Ice Cream Cup Icon at the bottom */}
        <g stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Dessert Cup container container */}
          <path d="M 239,374 L 261,374 L 257,388 L 243,388 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1" />
          
          {/* Swirled ice-cream mountain topping with details */}
          <path d="M 241,374 C 238,371 238,364 244,362 Q 242,357 247,355 Q 250,348 252,355 Q 257,357 256,362 C 261,364 261,371 258,374 Z" fill="#FFFFFF" />
          
          {/* Little elegant dark separation lines for the swirl curves */}
          <path d="M 245,364 C 248,367 253,367 255,364" stroke="#D01C1C" strokeWidth="1.5" />
          <path d="M 248,359 C 249,361 251,361 252,359" stroke="#D01C1C" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}
