import type { AddonKey } from "@inviteme/shared";

// Icone disegnate: un tratto solo, griglia 24, angoli arrotondati. Nessun simbolo Unicode.
const PATHS: Record<AddonKey, React.ReactNode> = {
  rsvp: <path d="M4 12.5l5 5L20 6.5" />,
  program: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h13" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s-6-5.6-6-10.5a6 6 0 0112 0C18 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  countdown: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.5V13l2.5 1.5M9.5 3h5" />
    </>
  ),
  gallery: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5" />
    </>
  ),
  express: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />,
};

export function Glyph({ name }: { name: AddonKey }) {
  return (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}
