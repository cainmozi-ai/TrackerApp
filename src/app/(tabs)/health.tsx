import { NutritionScreen } from '@/app/health/nutrition';

/** The design has no Health hub — the Health tab is the Nutrition screen.
 * From here the calorie/macro card drills into Micronutrients, and a
 * wellness category drills into its own screen. */
export default function HealthTab() {
  return <NutritionScreen asTab />;
}
