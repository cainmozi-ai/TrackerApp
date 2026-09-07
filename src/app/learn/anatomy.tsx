import { ArticleScreen } from '@/components/learn/ArticleScreen';

export default function LearnAnatomy() {
  return (
    <ArticleScreen
      title="Basic Anatomy"
      intro="A quick map of how the body is organised. These terms show up everywhere in training, nutrition and health — knowing them makes the rest click into place."
      sections={[
        {
          heading: 'Body systems',
          bullets: [
            { term: 'Skeletal', text: '206 bones that give structure, protect organs and store minerals like calcium.' },
            { term: 'Muscular', text: 'Over 600 muscles that move the skeleton and generate heat.' },
            { term: 'Cardiovascular', text: 'Heart and vessels delivering oxygen and nutrients and clearing waste.' },
            { term: 'Nervous', text: 'Brain, spinal cord and nerves that coordinate every movement and signal.' },
          ],
        },
        {
          heading: 'Anatomical position',
          body: 'The reference posture: standing upright, facing forward, arms at the sides with palms forward. Every directional term is described from here.',
        },
        {
          heading: 'Directional terms',
          bullets: [
            { term: 'Anterior / posterior', text: 'Front / back of the body.' },
            { term: 'Superior / inferior', text: 'Above / below.' },
            { term: 'Medial / lateral', text: 'Toward / away from the midline.' },
            { term: 'Proximal / distal', text: 'Nearer to / further from the point of attachment.' },
          ],
        },
        {
          heading: 'Joints',
          body: 'Where bones meet. Hinge joints (elbow, knee) flex and extend; ball-and-socket joints (shoulder, hip) move in all directions. Cartilage cushions them and ligaments hold them together — train through full, controlled ranges to keep them healthy.',
        },
      ]}
    />
  );
}
