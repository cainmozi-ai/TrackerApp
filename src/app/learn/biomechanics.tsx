import { ArticleScreen } from '@/components/learn/ArticleScreen';

export default function LearnBiomechanics() {
  return (
    <ArticleScreen
      title="Biomechanics"
      intro="Biomechanics is how forces act on the body. Grasp a few basics and you'll understand why some exercises feel harder, where the tension goes, and how to lift safely."
      sections={[
        {
          heading: 'Levers',
          body: 'Your bones are levers, joints are the pivots (fulcrums) and muscles supply the force. Where the load sits relative to the joint changes how hard a muscle must work — a longer lever arm means more torque and more difficulty.',
        },
        {
          heading: 'Planes of motion',
          bullets: [
            { term: 'Sagittal', text: 'Forward/back — squats, curls, rows.' },
            { term: 'Frontal', text: 'Side to side — lateral raises, side lunges.' },
            { term: 'Transverse', text: 'Rotational — cable woodchops, twists.' },
          ],
        },
        {
          heading: 'Joint actions',
          bullets: [
            { term: 'Flexion / extension', text: 'Decreasing or increasing the angle at a joint.' },
            { term: 'Abduction / adduction', text: 'Moving a limb away from or toward the midline.' },
            { term: 'Rotation', text: 'Turning a segment around its long axis.' },
          ],
        },
        {
          heading: 'Force, torque & range',
          body: 'Muscle tension is highest where the moment arm is longest — that’s the “sticking point” of a lift. Training through a full range of motion under control builds strength across the whole curve and protects the joint.',
        },
        {
          heading: 'Applying it',
          body: 'Match the resistance profile to the movement (free weights, cables, machines each load differently), keep the load path over the working joint, and brace the core to transfer force efficiently.',
        },
      ]}
    />
  );
}
