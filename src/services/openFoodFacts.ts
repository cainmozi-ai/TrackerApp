import type { Food } from '@/types';

const BASE_URL = 'https://world.openfoodfacts.org';

interface OFFProduct {
  product_name?: string;
  brands?: string;
  code?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number | string;
}

/** Work out the label's serving amount and whether it's solid (g) or liquid (ml). */
function parseServing(product: OFFProduct): { qty: number; unit: 'g' | 'ml' } | null {
  const sizeText = (product.serving_size || '').toLowerCase();
  const unit: 'g' | 'ml' = /\bml\b|millilit|\bcl\b|\bl\b/.test(sizeText) ? 'ml' : 'g';

  let qty = Number(product.serving_quantity);
  if (!qty || !isFinite(qty) || qty <= 0) {
    const m = sizeText.match(/([\d.]+)\s*(g|ml)/);
    if (m) qty = parseFloat(m[1]);
  }
  if (!qty || !isFinite(qty) || qty <= 0) return null;
  return { qty, unit };
}

/** OFF nutriments are always per 100 g/ml. Labels often ALSO print a per-serving
 * column (e.g. "per 30g"), and OFF reports that serving size separately — mixing
 * the two up inflates every food by the 100g-to-serving ratio. We normalize here:
 * the returned Food's nutrition matches its servingSize exactly. */
function parseProduct(product: OFFProduct): Food {
  const n = product.nutriments || {};
  const serving = parseServing(product);
  // Scale per-100 values down/up to the serving; fall back to a clean per-100 basis.
  const scale = serving ? serving.qty / 100 : 1;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  return {
    id: 0,
    name: product.product_name || 'Unknown',
    brand: product.brands || null,
    barcode: product.code || null,
    calories: Math.round((n['energy-kcal_100g'] || 0) * scale),
    protein: round1((n.proteins_100g || 0) * scale),
    carbs: round1((n.carbohydrates_100g || 0) * scale),
    fat: round1((n.fat_100g || 0) * scale),
    fiber: n.fiber_100g != null ? round1(n.fiber_100g * scale) : null,
    sugar: n.sugars_100g != null ? round1(n.sugars_100g * scale) : null,
    // OFF reports sodium in grams; the app tracks it in mg.
    sodium: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000 * scale) : null,
    servingSize: serving ? serving.qty : 100,
    servingUnit: serving ? serving.unit : 'g',
    isCustom: false,
    isFavorite: false,
    createdAt: '',
  };
}

const FIELDS = 'product_name,brands,code,nutriments,serving_size,serving_quantity';

export async function searchOpenFoodFacts(query: string, page = 1): Promise<Food[]> {
  try {
    const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=20&fields=${FIELDS}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.products) return [];
    return data.products
      .filter((p: OFFProduct) => p.product_name)
      .map(parseProduct);
  } catch {
    return [];
  }
}

export async function lookupBarcode(barcode: string): Promise<Food | null> {
  try {
    const url = `${BASE_URL}/api/v2/product/${barcode}?fields=${FIELDS}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.product || !data.product.product_name) return null;
    return parseProduct(data.product);
  } catch {
    return null;
  }
}
