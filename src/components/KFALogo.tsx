export default function KFALogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Knowledge Fons Academy"
      className={`h-20 w-auto object-contain ${className}`}
    />
  );
}
