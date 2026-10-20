import { ResetPage } from "./ResetPage";
import { getLang } from "@/lib/i18n";

export default async function Reset() {
  return <ResetPage lang={await getLang()} />;
}
