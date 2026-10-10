import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// Sezione a fisarmonica: il contenuto è nascosto finché non si apre. Usa <details>, quindi tastiera e lettori di schermo funzionano senza JavaScript.
export function Accordion({ title, summary, defaultOpen = false, className, children }: { title: string; summary?: string; defaultOpen?: boolean; className?: string; children: ReactNode }) {
  return (
    <details className={`acc ${className ?? ""}`} open={defaultOpen}>
      <summary className="acc-head">
        <span className="acc-title">{title}</span>
        {summary && <span className="acc-summary">{summary}</span>}
        <ChevronDown size={18} aria-hidden="true" className="acc-chev" />
      </summary>
      <div className="acc-body">{children}</div>
    </details>
  );
}
