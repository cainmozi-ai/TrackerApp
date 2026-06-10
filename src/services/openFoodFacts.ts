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
  serving_quantity?: number;
}

function parseProduct(product: OFFProduct): Food {
  const n = product.nutriments || {};
  return {
    id: 0,
    name: product.product_name || 'Unknown',
    brand: product.brands || null,
    barcode: product.code || null,
    calories: n['energy-kcal_100g'] || 0,
    protein: n.proteins_100g || 0,
    carbs: n.carbohydrates_100g || 0,
    fat: n.fat_100g || 0,
    fiber: n.fiber_100g || null,
    sugar: n.sugars_100g || null,
    sodium: n.sodium_100g || null,
    servingSize: product.serving_quantity || 100,
    servingUnit: 'g',
    isCustom: false,
    isFavorite: false,
    createdAt: '',
  };
}

export async function searchOpenFoodFacts(query: string, page = 1): Promise<Food[]> {
  try {
    const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=20&fields=product_name,brands,code,nutriments,serving_size,serving_quantity`;
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
    const url = `${BASE_URL}/api/v2/product/${barcode}?fields=product_name,brands,code,nutriments,serving_size,serving_quantity`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.product || !data.product.product_name) return null;
    return parseProduct(data.product);
  } catch {
    return null;
  }
}
