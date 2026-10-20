import { Nav } from "./Nav";
import type { Lang } from "@/lib/ui";

// Pagina legale in bozza: il testo va verificato da un professionista prima della pubblicazione definitiva.
export function LegalPage({ title, updated, lang, draft, children }: { title: string; updated: string; lang: Lang; draft: string; children: React.ReactNode }) {
  return (
    <>
      <Nav lang={lang} />
      <main className="wrap legal">
        <p className="legal-draft" role="note">{draft}</p>
        <h1>{title}</h1>
        <p className="hint">{updated}</p>
        <div className="legal-body">{children}</div>
      </main>
    </>
  );
}
