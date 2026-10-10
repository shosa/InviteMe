"use client";

// Interruttore accessibile: un checkbox nativo con role="switch", così tastiera e lettori di schermo funzionano.
export function Switch({ checked, onChange, label, ariaLabel, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; ariaLabel?: string; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" className="switch-input" aria-label={ariaLabel ?? label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}
