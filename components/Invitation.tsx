import type { CSSProperties, ReactNode } from "react";
import { EVENT_TYPES, STYLES } from "@/lib/catalog";
import type { InviteConfig } from "@/lib/invitation";
import { Countdown } from "./Countdown";

const SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const MONTHS_IT = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WEEKDAYS_IT = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Data scomposta in parti: su Save the Date diventa un blocco tipografico, non una riga di testo.
function dateParts(iso: string, locale: "it" | "en") {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const months = locale === "it" ? MONTHS_IT : MONTHS_EN;
  const weekdays = locale === "it" ? WEEKDAYS_IT : WEEKDAYS_EN;
  return { day: d.getDate(), month: months[d.getMonth()], year: d.getFullYear(), weekday: weekdays[d.getDay()] };
}

export function Invitation({ config, children }: { config: InviteConfig; children?: ReactNode }) {
  const style = STYLES.find((s) => s.id === config.styleId) ?? STYLES[0];
  const vars = {
    "--inv-bg": style.bg,
    "--inv-ink": style.ink,
    "--inv-accent": style.accent,
    "--inv-font": style.font === "serif" ? SERIF : SANS,
  } as CSSProperties;

  const eventLabel = EVENT_TYPES.find((e) => e.id === config.eventType)?.label ?? "Evento";
  const date = dateParts(config.eventDate, config.locale);
  const target = `${config.eventDate}T${config.eventTime || "00:00"}`;
  const photo = config.photos[0];
  const place = `${config.venue}${config.address ? `, ${config.address}` : ""}`;
  const mapQuery = encodeURIComponent(`${config.venue} ${config.address}`);
  const showCountdown = config.addons.includes("countdown");

  if (config.model === "save-the-date") {
    return (
      <article className="inv inv-std" style={vars} aria-label={config.title}>
        <p className="inv-eyebrow">Save the date</p>
        {photo && (
          <div className="inv-arch">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" />
          </div>
        )}
        <h1 className="inv-names">{config.title}</h1>
        {date && (
          <div className="inv-datebox" aria-label={`${date.weekday} ${date.day} ${date.month} ${date.year}`}>
            <span className="inv-day">{date.day}</span>
            <span className="inv-month">{date.month}</span>
            <span className="inv-year">{date.year}</span>
          </div>
        )}
        <p className="inv-place">{place}</p>
        {config.message && <p className="inv-message">{config.message}</p>}
        {showCountdown && <Countdown target={target} />}
        <p className="inv-hosts">{config.hosts}</p>
      </article>
    );
  }

  return (
    <article className="inv inv-full" style={vars} aria-label={config.title}>
      <p className="inv-eyebrow">{eventLabel}</p>
      {photo && (
        <div className="inv-arch">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" />
        </div>
      )}
      <h1 className="inv-names">{config.title}</h1>
      <p className="inv-hosts">{config.hosts}</p>
      {config.message && <p className="inv-message">{config.message}</p>}

      <dl className="inv-details">
        <div>
          <dt>Quando</dt>
          <dd>
            {date ? `${date.weekday} ${date.day} ${date.month} ${date.year}` : config.eventDate}
            {config.eventTime && <span className="inv-sub">alle {config.eventTime}</span>}
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

      {config.sections.length > 0 && (
        <div className="inv-program">
          {config.sections.map((s) => (
            <section key={s.id}>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
      )}

      {showCountdown && <Countdown target={target} />}

      {config.addons.includes("map") && config.address && (
        <div className="inv-map">
          <iframe
            title={`Mappa: ${config.venue}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
          />
          <a className="inv-link" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer">
            Apri le indicazioni
          </a>
        </div>
      )}

      {config.addons.includes("music") && config.musicUrl && (
        <div className="inv-music">
          <p>Musica per la serata</p>
          <audio controls preload="none" src={config.musicUrl}>
            Il tuo browser non supporta l&apos;audio.
          </audio>
        </div>
      )}

      {children}
    </article>
  );
}
