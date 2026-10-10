// Logo InviteMe: un arco (la forma degli inviti) con il sigillo di ceralacca in basso.
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 36V18a12 12 0 0 1 24 0v18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="20" cy="27" r="4.6" fill="var(--brass)" />
      <path d="M8 36h24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word">InviteMe</span>
    </span>
  );
}
