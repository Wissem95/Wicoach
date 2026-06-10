import type { OffProduct } from "@/types";

// Open Food Facts — free, no API key. Strong FR database (Monoprix etc.).
const BARCODE_URL = "https://world.openfoodfacts.org/api/v2/product";
const SEARCH_URL = "https://world.openfoodfacts.org/api/v2/search";
const FIELDS = "code,product_name,brands,nutrition_grades,image_front_small_url,nutriments";
// OFF asks every app to identify itself via the User-Agent header.
const USER_AGENT = "Wicoach/0.1 (personal fitness app)";

interface OffRawProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutrition_grades?: string;
  image_front_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: number | string | undefined): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? Math.max(0, n as number) : 0;
}

function normalize(p: OffRawProduct): OffProduct | null {
  const name = p.product_name?.trim();
  if (!name) return null;
  const n = p.nutriments ?? {};
  return {
    code: p.code ?? null,
    name,
    brand: p.brands?.split(",")[0]?.trim() || null,
    nutritionGrade: p.nutrition_grades?.trim()?.toUpperCase() || null,
    imageUrl: p.image_front_small_url || null,
    caloriesPer100g: Math.round(num(n["energy-kcal_100g"])),
    proteinPer100g: Math.round(num(n["proteins_100g"])),
    carbsPer100g: Math.round(num(n["carbohydrates_100g"])),
    fatsPer100g: Math.round(num(n["fat_100g"])),
  };
}

async function offFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    // Cache product data at the edge for a day; nutrition facts are stable.
    next: { revalidate: 86400 },
  });
}

/** Looks a product up by barcode. Returns null if not found. */
export async function getByBarcode(barcode: string): Promise<OffProduct | null> {
  const clean = barcode.replace(/\D/g, "");
  if (!clean) return null;
  try {
    const res = await offFetch(`${BARCODE_URL}/${clean}.json?fields=${FIELDS}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: OffRawProduct };
    if (data.status !== 1 || !data.product) return null;
    return normalize(data.product);
  } catch {
    return null;
  }
}

/** Free-text search, biased towards French products. */
export async function searchByName(query: string, limit = 12): Promise<OffProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({
    fields: FIELDS,
    countries_tags: "france",
    page_size: String(limit),
    sort_by: "popularity_key",
    search_terms: q,
  });
  try {
    const res = await offFetch(`${SEARCH_URL}?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: OffRawProduct[] };
    return (data.products ?? [])
      .map(normalize)
      .filter((p): p is OffProduct => p !== null);
  } catch {
    return [];
  }
}

/** Scales per-100g values to an arbitrary gram portion. */
export function scaleToPortion(product: OffProduct, grams: number) {
  const factor = Math.max(0, grams) / 100;
  return {
    calories: Math.round(product.caloriesPer100g * factor),
    protein: Math.round(product.proteinPer100g * factor),
    carbs: Math.round(product.carbsPer100g * factor),
    fats: Math.round(product.fatsPer100g * factor),
  };
}
