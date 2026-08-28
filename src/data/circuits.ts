/** Body-part circuit presets — drop-in groups of exercises you can add to a
 * session in one tap. Exercise names are matched (case-insensitively) against
 * the exercise library; any that aren't found are skipped gracefully. */
export interface CircuitPreset {
  name: string;
  muscleGroup: string;
  /** Short blurb shown under the name. */
  blurb: string;
  exercises: string[];
}

export const CIRCUITS: CircuitPreset[] = [
  {
    name: 'Forearm Circuit',
    muscleGroup: 'Arms',
    blurb: 'Grip & forearm finisher',
    exercises: ['Reverse Curl', 'Wrist Curl', 'Hammer Curl'],
  },
  {
    name: 'Biceps Burnout',
    muscleGroup: 'Arms',
    blurb: 'Three-move biceps pump',
    exercises: ['Barbell Curl', 'Hammer Curl', 'Concentration Curl'],
  },
  {
    name: 'Triceps Finisher',
    muscleGroup: 'Arms',
    blurb: 'Push to failure',
    exercises: ['Tricep Pushdown', 'Tricep Kickback'],
  },
  {
    name: 'Core Circuit',
    muscleGroup: 'Core',
    blurb: 'Rotate with no rest',
    exercises: ['Plank', 'Hollow Body Hold', 'Dead Bug', 'Mountain Climber'],
  },
  {
    name: 'Quad Burnout',
    muscleGroup: 'Legs',
    blurb: 'Legs on fire',
    exercises: ['Leg Press', 'Wall Sit'],
  },
];
