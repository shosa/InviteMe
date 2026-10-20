// Illustrazioni vettoriali della dashboard: coriandoli e un nastro di festa, nei colori dell'invito.
export function Confetti({ color, className }: { color: string; className?: string }) {
  const bits: [number, number, number, number][] = [
    [14, 18, 9, -20], [82, 12, 7, 35], [30, 64, 6, 80], [70, 60, 10, -55], [48, 30, 5, 10],
    [92, 44, 6, 60], [6, 46, 7, -35], [60, 84, 5, 25], [38, 90, 6, -70], [22, 32, 4, 45],
  ];
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {bits.map(([x, y, s, r], i) => (
        <rect key={i} x={x} y={y} width={s * 1.6} height={s * 0.6} rx={s * 0.2} fill={i % 2 ? color : "currentColor"} opacity={0.85} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <circle cx="50" cy="50" r="3" fill={color} />
    </svg>
  );
}

export function Trophy({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false">
      <path d="M36 22h48v26a24 24 0 0 1-48 0z" fill={color} />
      <path d="M36 30H22a12 12 0 0 0 14 22M84 30h14a12 12 0 0 1-14 22" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <rect x="54" y="72" width="12" height="18" fill={color} />
      <rect x="38" y="90" width="44" height="10" rx="3" fill="currentColor" />
      <path d="M50 14l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="#F5C542" />
      <path d="M70 12l2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6z" fill="#F5C542" />
    </svg>
  );
}
