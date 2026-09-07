import { ArticleScreen } from '@/components/learn/ArticleScreen';

export default function LearnNutrition() {
  return (
    <ArticleScreen
      title="Nutrition"
      intro="Everything you eat breaks down into macronutrients (energy) and micronutrients (the vitamins and minerals that keep the machine running). Here's how they work."
      sections={[
        {
          heading: 'Macronutrients',
          body: 'Macros supply your energy, measured in calories. You need all three:',
          bullets: [
            { term: 'Protein', text: '4 kcal/g. Builds and repairs muscle. Aim for ~1.6–2.2 g per kg of bodyweight if training.' },
            { term: 'Carbohydrates', text: '4 kcal/g. Your body’s preferred fuel, especially for hard training. Prioritise whole-food sources and fibre.' },
            { term: 'Fat', text: '9 kcal/g. Drives hormone production and absorbs fat-soluble vitamins. Don’t drop it too low.' },
          ],
        },
        {
          heading: 'Energy balance',
          body: 'Bodyweight is governed by calories in vs out. A surplus builds mass (muscle + fat), a deficit loses it. Protein and training steer how much of that change is muscle vs fat.',
        },
        {
          heading: 'Micronutrients',
          body: 'Micros don’t give energy but enable nearly every process in the body.',
          bullets: [
            { term: 'Vitamins', text: 'Organic compounds (A, C, D, E, K and the B-complex) for immunity, energy metabolism, skin and bone.' },
            { term: 'Minerals', text: 'Inorganic elements (calcium, iron, magnesium, zinc, potassium…) for bones, oxygen transport, nerves and muscle contraction.' },
          ],
        },
        {
          heading: 'Fibre & hydration',
          body: 'Fibre slows digestion, feeds gut bacteria and keeps you full — aim for 25–35 g a day. Water carries nutrients and regulates temperature; thirst is a late signal, so sip through the day.',
        },
      ]}
    />
  );
}
