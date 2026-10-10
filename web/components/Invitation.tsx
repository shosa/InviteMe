import type { CSSProperties, ReactNode } from "react";
import { EVENT_TYPES, type AddonKey, type InviteConfig, type StyleDef } from "@inviteme/shared";
import { Countdown } from "./Countdown";

const MONTHS = {
  it: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const WEEKDAYS = {
  it: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export function dateParts(iso: string, locale: "it" | "en") {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { day: d.getDate(), month: MONTHS[locale][d.getMonth()], year: d.getFullYear(), weekday: WEEKDAYS[locale][d.getDay()] };
}

// Monogramma dalle iniziali del titolo: "Sara & Luca" → "S·L".
export function monogram(title: string): string {
  const words = title.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((w) => w && !["e", "and", "the", "il", "la"].includes(w.toLowerCase()));
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("·") || "IM";
}

// Righe del programma nella forma "19:30 - Cerimonia": diventano una sequenza con orari.
const TIME_LINE = /^(\d{1,2}[:.]\d{2})\s*(?:[-–—|:]\s*)?(.+)$/;
export function parseTimeline(body: string) {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const items = lines.map((l) => l.match(TIME_LINE)).filter(Boolean) as RegExpMatchArray[];
  if (items.length !== lines.length || lines.length === 0) return null;
  return items.map((m) => ({ time: m[1].replace(".", ":"), label: m[2].trim() }));
}

type Props = {
  config: InviteConfig;
  style: StyleDef;
  features: AddonKey[];
  children?: ReactNode;
};

export function Invitation({ config, style, features, children }: Props) {
  const has = (k: AddonKey) => features.includes(k);
  const vars = {
    "--inv-bg": style.bg,
    "--inv-ink": style.ink,
    "--inv-accent": style.accent,
    "--inv-face": style.font === "serif" ? "var(--font-display), Georgia, serif" : "var(--font-text), system-ui, sans-serif",
  } as CSSProperties;

  const eventLabel = EVENT_TYPES.find((e) => e.id === config.eventType)?.label ?? "";
  const date = dateParts(config.eventDate, config.locale);
  const target = `${config.eventDate}T${config.eventTime || "00:00"}`;
  const photo = config.photos[0];
  const mapQuery = encodeURIComponent(`${config.venue} ${config.address}`);
  const saveTheDate = config.model === "save-the-date";

  return (
    <article className={`inv ${saveTheDate ? "inv--std" : "inv--full"}`} style={vars} aria-label={config.title} data-inv>
      <div className="inv-arch" data-reveal>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <div className="inv-arch-art" aria-hidden>
            <span className="inv-monogram">{monogram(config.title)}</span>
          </div>
        )}
      </div>

      <div className="inv-title" data-reveal>
        <h1 className="inv-names">{config.title}</h1>
        <p className="inv-hosts">{config.hosts}</p>
      </div>

      {config.message && <p className="inv-message" data-reveal>{config.message}</p>}

      {date && (
        <div className="inv-date" data-reveal aria-label={`${date.weekday} ${date.day} ${date.month} ${date.year}`}>
          <span className="inv-day">{date.day}</span>
          <span className="inv-month">
            <b>{date.month}</b>
            <small>{date.year}, {date.weekday}</small>
          </span>
        </div>
      )}

      {has("countdown") && (
        <div className="inv-block" data-reveal>
          <Countdown target={target} />
        </div>
      )}

      {!saveTheDate && (
        <dl className="inv-details" data-reveal>
          <div>
            <dt>Dove</dt>
            <dd>
              {config.venue}
              {config.address && <span className="inv-sub">{config.address}</span>}
            </dd>
          </div>
          {eventLabel && (
            <div>
              <dt>Occasione</dt>
              <dd>{eventLabel}</dd>
            </div>
          )}
        </dl>
      )}

      {!saveTheDate && has("program") && config.sections.length > 0 && (
        <div className="inv-program" data-reveal>
          {config.sections.map((s) => {
            const timeline = parseTimeline(s.body);
            return (
              <section key={s.id} className="inv-block">
                <h2>{s.title}</h2>
                {timeline ? (
                  <ol className="inv-timeline">
                    {timeline.map((t) => (
                      <li key={t.time + t.label}>
                        <time>{t.time}</time>
                        <span>{t.label}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>{s.body}</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {has("map") && config.address && (
        <div className="inv-block inv-map" data-reveal>
          <iframe
            title={`Mappa: ${config.venue}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
          />
          <a className="inv-link" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer">
            Indicazioni
          </a>
        </div>
      )}

      {children}
    </article>
  );
}
