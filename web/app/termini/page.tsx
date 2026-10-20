import { LegalPage } from "@/components/LegalPage";
import { getLang } from "@/lib/i18n";

export default async function Termini() {
  const lang = await getLang();
  if (lang === "en") {
    return (
      <LegalPage lang="en" title="Terms of service" updated="Last updated: to be set" draft="DRAFT: text to be verified before publication. It has no legal effect yet.">
        <h2>1. The service</h2>
        <p>InviteMe lets you create a digital invitation with a personal page, guest attendance replies and reply management.</p>
        <h2>2. Purchase</h2>
        <p>Payment is one-time per invitation. After payment the invitation can no longer be edited, and the link stays the same.</p>
        <h2>3. Content</h2>
        <p>You are responsible for the texts, photos and music you upload. You must have the rights to use them, and you may not upload unlawful content or images of people without their consent.</p>
        <h2>4. Refunds</h2>
        <p>To be defined with the service owner.</p>
        <h2>5. Contact</h2>
        <p>To be defined with the service owner.</p>
      </LegalPage>
    );
  }
  return (
    <LegalPage lang="it" title="Termini di servizio" updated="Ultimo aggiornamento: da definire" draft="BOZZA: testo da verificare prima della pubblicazione. Non ha ancora valore legale.">
      <h2>1. Il servizio</h2>
      <p>InviteMe permette di creare un invito digitale con una pagina personale, la conferma di presenza degli ospiti e la gestione delle risposte.</p>
      <h2>2. Acquisto</h2>
      <p>Il pagamento è unico per ogni invito. Dopo il pagamento l&apos;invito non è più modificabile, e il link resta lo stesso.</p>
      <h2>3. Contenuti</h2>
      <p>Sei responsabile dei testi, delle foto e dei brani musicali che carichi. Devi avere i diritti per usarli, e non puoi caricare contenuti illeciti o che ritraggano persone senza il loro consenso.</p>
      <h2>4. Rimborsi</h2>
      <p>Da definire con il titolare del servizio.</p>
      <h2>5. Contatti</h2>
      <p>Da definire con il titolare del servizio.</p>
    </LegalPage>
  );
}
