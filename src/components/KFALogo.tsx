export default function KFALogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/Logo.png"
      alt="Knowledge Fons Academy"
      className={`h-20 w-auto object-contain ${className}`}
    />
  );
}
