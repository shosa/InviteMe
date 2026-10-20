import { LocalCheckoutPage } from "./LocalCheckoutPage";
import { getLang } from "@/lib/i18n";

export default async function Page() {
  return <LocalCheckoutPage lang={await getLang()} />;
}
