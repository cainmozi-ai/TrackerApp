import { ArticleScreen } from '@/components/learn/ArticleScreen';

export default function LearnMyology() {
  return (
    <ArticleScreen
      title="Myology"
      intro="Myology is the study of muscles. Understanding what each muscle does — and how they work in pairs — helps you train with intent and avoid weak links."
      sections={[
        {
          heading: 'Major muscle groups',
          bullets: [
            { term: 'Chest (pectorals)', text: 'Pushes the arms forward and across the body — presses and flyes.' },
            { term: 'Back (lats, traps, rhomboids)', text: 'Pulls the arms down and back and stabilises the spine — rows and pulldowns.' },
            { term: 'Shoulders (deltoids)', text: 'Three heads — front, side, rear — that raise and rotate the arm.' },
            { term: 'Arms (biceps, triceps)', text: 'Biceps flex the elbow; triceps extend it and make up ~2/3 of arm size.' },
            { term: 'Legs (quads, hamstrings, glutes, calves)', text: 'The biggest, strongest muscles — squats, hinges and extensions.' },
            { term: 'Core (abs, obliques, erectors)', text: 'Braces and rotates the trunk and protects the spine under load.' },
          ],
        },
        {
          heading: 'How muscles move you',
          bullets: [
            { term: 'Agonist', text: 'The prime mover doing the work (e.g. biceps in a curl).' },
            { term: 'Antagonist', text: 'The opposing muscle that lengthens to allow it (triceps in a curl).' },
            { term: 'Concentric', text: 'The muscle shortens under load — the lifting phase.' },
            { term: 'Eccentric', text: 'The muscle lengthens under load — the lowering phase, where most growth stimulus lives.' },
          ],
        },
        {
          heading: 'Fibre types',
          bullets: [
            { term: 'Type I (slow-twitch)', text: 'Fatigue-resistant, endurance-oriented, powers long efforts.' },
            { term: 'Type II (fast-twitch)', text: 'Powerful and quick to fatigue, recruited for heavy or explosive work.' },
          ],
        },
        {
          heading: 'Training implication',
          body: 'Muscles grow from progressive tension across their full range, adequate volume (weekly hard sets), and recovery. Train opposing groups in balance to keep joints healthy.',
        },
      ]}
    />
  );
}
