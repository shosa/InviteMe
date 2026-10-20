// Categorie dei template: la vetrina le raggruppa e le filtra, e il contenuto d'esempio segue la categoria.
export const THEME_CATEGORIES_ORDER = ["wedding", "baby", "birthday", "graduation", "anniversary", "corporate"] as const;
export type ThemeCategory = (typeof THEME_CATEGORIES_ORDER)[number];

// Un template può stare in più categorie: la prima è quella con cui compare nel gruppo "Tutti".
export const THEME_CATEGORIES: Record<string, ThemeCategory[]> = {
  "anniversario-oro": ["anniversary"],
  "argento-anniversario": ["anniversary"],
  "autunno-cena": ["corporate", "anniversary"],
  "baby-shower": ["baby"],
  "battesimo-celeste": ["baby"],
  "compleanno-festa": ["birthday"],
  "festa-spiaggia": ["birthday"],
  "gala-aziendale": ["corporate"],
  "giardino": ["wedding", "anniversary"],
  "invitereference": ["wedding"],
  "laurea-giulia": ["graduation"],
  "lavanda-nozze": ["wedding"],
  "matrimonio-citta": ["wedding"],
  "matrimonio-lago": ["wedding"],
  "minimo": ["wedding", "baby", "birthday", "graduation", "anniversary", "corporate"],
  "notturno": ["wedding", "corporate"],
  "pensionamento": ["birthday", "corporate"],
  "prima-comunione": ["baby"],
  "rivista": ["corporate", "graduation"],
  "velo": ["wedding"],
};

export function themeCategories(themeId: string): ThemeCategory[] {
  return THEME_CATEGORIES[themeId] ?? ["wedding"];
}
