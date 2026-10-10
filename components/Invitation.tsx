import type { CSSProperties, ReactNode } from "react";
import type { InviteConfig } from "@/lib/invitation";
import { Countdown } from "./Countdown";

const FONTS: Record<InviteConfig["font"], string> = {
  serif: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
  script: '"Brush Script MT", "Segoe Script", cursive',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

function formatDate(iso: string, locale: "it" | "en") {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

// Rendering puro dell'invito: usato dall'anteprima del builder e dalla pagina pubblica.
export function Invitation({ config, children }: { config: InviteConfig; children?: ReactNode }) {
  const style = {
    "--inv-bg": config.colors.bg,
    "--inv-ink": config.colors.ink,
    "--inv-accent": config.colors.accent,
    "--inv-font": FONTS[config.font],
  } as CSSProperties;

  const hasPhotos = config.photos.length > 0;

  return (
    <article className="inv" style={style} aria-label={config.title}>
      <div className="inv-glow" aria-hidden />
      <header className="inv-head">
        <p className="inv-kicker">{config.hosts}</p>
        <h1 className="inv-title">{config.title}</h1>
        <div className="inv-rule" aria-hidden />
        <p className="inv-message">{config.message}</p>
      </header>

      {hasPhotos && (
        <div className="inv-photos" data-count={Math.min(config.photos.length, 3)}>
          {config.photos.slice(0, 3).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" />
          ))}
        </div>
      )}

      <dl className="inv-details">
        <div>
          <dt>Quando</dt>
          <dd>
            {formatDate(config.eventDate, config.locale)}
            {config.eventTime && ` · ${config.eventTime}`}
          </dd>
        </div>
        <div>
          <dt>Dove</dt>
          <dd>
            {config.venue}
            {config.address && <span className="inv-sub">{config.address}</span>}
          </dd>
        </div>
      </dl>

      {config.sections.map((s) => (
        <section key={s.id} className="inv-section">
          <h2>{s.title}</h2>
          <p>{s.body}</p>
        </section>
      ))}

      {config.addons.includes("countdown") && (
        <Countdown target={`${config.eventDate}T${config.eventTime || "00:00"}`} />
      )}

      {children}
    </article>
  );
}
