// Módulo centralizado de categorías y persistencia compartida
// Provee grupos base, carga/guardado de dinámicas y utilidades.

export const FERMENTADAS = [
  "Vino",
  "Cerveza",
  "Sidra",
  "Sake",
  "Kombucha",
] as const;
export const DESTILADAS = [
  "Vodka",
  "Ron",
  "Ginebra",
  "Tequila",
  "Whisky",
  "Pisco",
  "Brandy",
  "Mezcal",
  "Aguardiente",
  // Ampliaciones populares para mejor filtrado:
  // Licor Anisado (anís) y Fernet son destilados / macerados amargos.
  // "Aperitivo" se usa como categoría genérica para bitters, vermouth, etc.
  "Licor Anisado",
  "Fernet",
  "Aperitivo",
  // Aperitivos y licores específicos (selección común en bares / retail):
  "Vermouth",
  "Campari", // Bitter rojo
  "Aperol", // Bitter naranja suave
  "Amaretto",
  "Sambuca",
  "Limoncello",
  "Licor de Hierbas", // Ej: Jägermeister
  "Licor de Café",
  "Licor de Coco",
  "Triple Sec",
  "Licor de Naranja", // Cointreau / variantes
  "Curaçao",
  "Licor de Menta",
] as const;
export const FANTASIA = [
  "Licuado",
  "Cocktail Ready",
  "Spritzer",
  "Hard Seltzer",
  "Energética",
  "Gaseosa",
  "Jugo",
  "Agua Mineral",
] as const;
export const OTROS_BASE = [] as const;

export const LS_DYNAMIC_CATEGORIES_KEY = "cat_otros_dynamic_v2";

export type CategoryGroup = {
  title: string;
  items: string[];
};

export function loadDynamicCategories(): string[] {
  try {
    const raw = localStorage.getItem(LS_DYNAMIC_CATEGORIES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr))
      return arr.filter((c: unknown) => typeof c === "string");
    return [];
  } catch {
    return [];
  }
}

export function saveDynamicCategories(dynamic: string[]) {
  try {
    localStorage.setItem(LS_DYNAMIC_CATEGORIES_KEY, JSON.stringify(dynamic));
  } catch {
    /* ignore */
  }
}

export function getAllCategoryGroups(dynamic: string[]): CategoryGroup[] {
  // Separamos las dinámicas de "Otros" para mayor claridad UX.
  // Persistencia sigue usando la misma clave para no perder datos.
  return [
    { title: "Fermentadas", items: [...FERMENTADAS] },
    { title: "Destiladas", items: [...DESTILADAS] },
    { title: "Bebidas de Fantasía", items: [...FANTASIA] },
    { title: "Otros", items: [...OTROS_BASE] },
    { title: "Dinámicas", items: [...dynamic] },
  ];
}

export function getAllCategoriesFlat(dynamic: string[]): string[] {
  return getAllCategoryGroups(dynamic).flatMap((g) => g.items);
}
