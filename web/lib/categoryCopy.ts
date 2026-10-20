import { THEME_CATEGORIES_ORDER, type ThemeCategory } from "@inviteme/shared";
import type { Lang } from "@/lib/ui";

const LABEL: Record<Lang, Record<ThemeCategory, string>> = {
  it: { wedding: "Matrimoni", baby: "Battesimi e nascite", birthday: "Compleanni", graduation: "Lauree", anniversary: "Anniversari", corporate: "Aziendali" },
  en: { wedding: "Weddings", baby: "Baptisms & births", birthday: "Birthdays", graduation: "Graduations", anniversary: "Anniversaries", corporate: "Corporate" },
};

export function categoryLabel(c: ThemeCategory, lang: Lang): string {
  return LABEL[lang][c];
}

export function allLabel(lang: Lang): string {
  return lang === "en" ? "All" : "Tutti";
}

export const CATEGORY_LIST = THEME_CATEGORIES_ORDER;
