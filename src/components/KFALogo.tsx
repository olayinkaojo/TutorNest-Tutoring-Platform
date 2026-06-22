import logoImage from 'figma:asset/ea01ce3df8c02c45d4eb451fe2ec52975cee6847.png';

export default function KFALogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Logo Image */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20">
        <img src={logoImage} alt="Knowledge Fons Academy Logo" className="w-full h-full object-contain" />
      </div>
      
      {/* Text - Mansfield Font */}
      <div>
        <span 
          className="text-2xl sm:text-3xl md:text-4xl"
          style={{ 
            fontFamily: "'Mansfield', 'Georgia', 'Times New Roman', serif",
            fontWeight: 600,
            color: '#625d9c',
            letterSpacing: '0.02em'
          }}
        >
          Knowledge Fons Academy
        </span>
      </div>
    </div>
  );
}