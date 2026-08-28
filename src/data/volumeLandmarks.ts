/** General weekly hypertrophy volume landmarks (hard sets per muscle group per
 * week). Original, rounded rules of thumb — NOT copied from any proprietary
 * source — for a rough "am I training this enough?" read.
 *
 *  MEV = minimum to grow, MAV = productive middle, MRV = about as much as you
 *  can recover from. Below MEV → add sets; above MRV → consider backing off. */

export interface VolumeLandmark {
  mev: number;
  mav: number;
  mrv: number;
}

export const VOLUME_LANDMARKS: Record<string, VolumeLandmark> = {
  Chest: { mev: 8, mav: 16, mrv: 22 },
  Back: { mev: 10, mav: 18, mrv: 25 },
  Shoulders: { mev: 8, mav: 18, mrv: 26 },
  Legs: { mev: 8, mav: 16, mrv: 20 },
  Glutes: { mev: 4, mav: 12, mrv: 16 },
  Arms: { mev: 8, mav: 16, mrv: 24 },
  Core: { mev: 6, mav: 14, mrv: 22 },
};

export type VolumeStatus = 'under' | 'low' | 'optimal' | 'high' | 'over';

export function volumeStatus(sets: number, lm: VolumeLandmark): { status: VolumeStatus; label: string } {
  if (sets < lm.mev) return { status: 'under', label: 'below minimum — add sets' };
  if (sets < lm.mav) return { status: 'low', label: 'productive — room to add' };
  if (sets <= lm.mrv) return { status: 'optimal', label: 'in the sweet spot' };
  return { status: 'over', label: 'over max — consider a deload' };
}
