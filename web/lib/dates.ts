const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

// Giorno, mese e anno di una data yyyy-mm-dd, per le intestazioni del sito.
export function dateParts(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { day: d.getDate(), month: MONTHS[d.getMonth()], year: d.getFullYear() };
}
