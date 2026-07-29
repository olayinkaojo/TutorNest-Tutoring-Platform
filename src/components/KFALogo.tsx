// Imported rather than referenced by URL so the build fails loudly if the asset
// is missing. A bare "/Logo.png" is served the SPA's index.html by the catch-all
// rewrite in vercel.json, which renders as a broken image instead of a 404.
import logoUrl from '../../public/Knowledge_Fons_Academy_Logo.png';

export default function KFALogo({ className = '' }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Knowledge Fons Academy"
      className={`h-36 w-auto object-contain ${className}`}
    />
  );
}
