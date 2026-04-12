import type { ReactNode } from 'react';
import wallpaperBg from '../assets/c2a495c4aec3903270b747684d5b5dd5d609b3da.png';

interface AuthBackgroundProps {
  children: ReactNode;
  className?: string;
}

export function AuthBackground({ children, className = '' }: AuthBackgroundProps) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#fafbf8] ${className}`.trim()}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${wallpaperBg})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '350px 350px',
          opacity: 0.62,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to bottom right, rgba(245,243,255,0.52), rgba(255,255,255,0.58), rgba(240,253,244,0.52))',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}