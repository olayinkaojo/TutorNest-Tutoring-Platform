import React from 'react';

interface NairaIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function NairaIcon({ className = '', style }: NairaIconProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={style}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        {/* Naira symbol ₦ */}
        <path d="M6 4v16M18 4v16" />
        <path d="M6 4l12 16" />
        <path d="M4 9h16M4 15h16" />
      </svg>
    </div>
  );
}

export default NairaIcon;
