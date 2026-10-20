// Logo InviteMe: un arco (la forma degli inviti) con il sigillo di ceralacca in basso, dentro un quadrato teal.
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="0" y="0" width="40" height="40" rx="11" fill="#14B8A6" />
      <path d="M11 31V18a9 9 0 0 1 18 0v13" fill="none" stroke="#0E1116" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="20" cy="25" r="3.6" fill="#0E1116" />
      <path d="M11 31h18" fill="none" stroke="#0E1116" strokeWidth="2.2" strokeLinecap="round" />
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
