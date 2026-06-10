import type { Food } from '@/types';

/**
 * AI food recognition via Google Gemini's free-tier vision model.
 *
 * To enable: add your key to a `.env` file at the project root:
 *   EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
 * Get a free key at https://aistudio.google.com/app/apikey
 *
 * Without a key, isConfigured() returns false and the UI shows a manual
 * fallback instead of failing.
 */

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash';

export function isAiConfigured(): boolean {
  return !!API_KEY && API_KEY.length > 0;
}

export interface RecognizedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const PROMPT = `You are a nutrition assistant. Look at this meal photo and estimate the foods present.
Respond ONLY with a JSON array (no markdown) of objects with this exact shape:
[{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number}]
Estimate per the portion visible. Keep names short.`;

export async function recognizeFoodFromPhoto(base64Image: string): Promise<RecognizedFood[]> {
  if (!isAiConfigured()) {
    throw new Error('AI not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as RecognizedFood[];
    return parsed.filter(f => f && f.name);
  } catch {
    return [];
  }
}

export function recognizedToFood(r: RecognizedFood): Omit<Food, 'id' | 'createdAt' | 'isCustom'> {
  return {
    name: r.name,
    brand: 'AI estimate',
    barcode: null,
    calories: Math.round(r.calories) || 0,
    protein: Math.round(r.protein) || 0,
    carbs: Math.round(r.carbs) || 0,
    fat: Math.round(r.fat) || 0,
    fiber: null,
    sugar: null,
    sodium: null,
    servingSize: 1,
    servingUnit: 'serving',
    isFavorite: false,
  };
}
