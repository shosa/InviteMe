import { LegalPage } from "@/components/LegalPage";
import { getLang } from "@/lib/i18n";

export default async function Privacy() {
  const lang = await getLang();
  if (lang === "en") {
    return (
      <LegalPage lang="en" title="Privacy notice" updated="Last updated: to be set" draft="DRAFT: text to be verified before publication. It has no legal effect yet.">
        <h2>Data we collect</h2>
        <p>For the account: name, email and password (stored only as a hash). For the invitation: the content you enter. For guests: name, attendance reply and optional notes.</p>
        <h2>Purpose</h2>
        <p>To provide the service, send confirmations and service emails, and handle payments through the chosen provider.</p>
        <h2>Retention and rights</h2>
        <p>To be defined: retention periods, data subject rights and how to exercise them, with the data controller.</p>
        <h2>Cookies</h2>
        <p>We use a session cookie needed for log-in and a language cookie. No profiling cookies.</p>
      </LegalPage>
    );
  }
  return (
    <LegalPage lang="it" title="Informativa privacy" updated="Ultimo aggiornamento: da definire" draft="BOZZA: testo da verificare prima della pubblicazione. Non ha ancora valore legale.">
      <h2>Dati raccolti</h2>
      <p>Per l&apos;account: nome, email e password (conservata solo come hash). Per l&apos;invito: i contenuti che inserisci. Per gli ospiti: nome, risposta di presenza e note facoltative.</p>
      <h2>Finalità</h2>
      <p>Erogare il servizio, inviare le conferme e le email di servizio, e gestire i pagamenti tramite il provider scelto.</p>
      <h2>Conservazione e diritti</h2>
      <p>Da definire: tempi di conservazione, diritti dell&apos;interessato e modalità di esercizio, con il titolare del trattamento.</p>
      <h2>Cookie</h2>
      <p>Usiamo un cookie di sessione necessario al login e un cookie per la lingua. Nessun cookie di profilazione.</p>
    </LegalPage>
  );
}
