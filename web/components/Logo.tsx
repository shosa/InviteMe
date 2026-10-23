// Logo InviteMe, come nell'artifact Atelier: parola in Cormorant, filetto d'ottone e la tag «Atelier».
export function LogoMark() {
  return null;
}

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-word">InviteMe</span>
      <span className="logo-rule" aria-hidden="true" />
      <span className="logo-tag">Atelier</span>
    </span>
  );
}
