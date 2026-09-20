# Incus Figma Frame Map

Source: `i3up2XkzCrBsB7eizwHt2T`, page `Screens`, section `Incus — User Flow`.

## Design System

| Figma frame | Node | Code surface |
| --- | --- | --- |
| Design System | `198:2425` | `src/theme/index.ts`, common components, tab layout |

## Route Map

| Figma frame | Node | Route | Status |
| --- | --- | --- | --- |
| Onboarding | `198:2606` | `src/app/onboarding/index.tsx` | Inspected and aligned |
| Home — Dashboard | `198:2489` | `src/app/(tabs)/index.tsx` | Inspected and aligned |
| Customize Dashboard | `198:2648` | `src/app/dashboard-customize.tsx` | To inspect |
| Health — Hub | `198:2742` | `src/app/(tabs)/health.tsx`, `src/app/health/nutrition/index.tsx` | Inspected and aligned |
| Nutrition | `198:2839` | `src/app/health/nutrition/index.tsx` | Aligned via Health frame |
| Food Search | `198:2932` | `src/app/health/nutrition/search.tsx` | Inspected and aligned |
| Custom Food | `198:2989` | `src/app/health/nutrition/add-custom.tsx` | Inspected and aligned |
| Barcode Scan | `198:3034` | `src/app/health/nutrition/scan.tsx` | Inspected and aligned |
| Sleep Log | `198:2893` | `src/app/health/sleep.tsx` | Existing implementation retained |
| Fitness — Hub | `198:3073` | `src/app/(tabs)/fitness.tsx` | Inspected and aligned |
| Active Workout | `198:3117` | `src/app/fitness/active-workout.tsx` | Inspected and aligned; screenshot verification pending |
| Workout Summary | `198:3188` | `src/app/fitness/workout-summary.tsx` | Inspected and aligned; screenshot verification pending |
| Programs | `198:3250` | `src/app/fitness/programs.tsx` | To inspect |
| Exercise Library | `198:3294` | `src/app/fitness/exercise-library.tsx` | To inspect |
| Exercise Detail | `198:3386` | `src/app/fitness/exercise-detail.tsx` | To inspect |
| Progress | `198:3429` | `src/app/fitness/progress.tsx` | To inspect |
| Workout History | `198:3495` | `src/app/fitness/workout-detail.tsx` | To inspect |
| Life — Hub | `198:3566` | `src/app/(tabs)/life.tsx` | Inspected; requires screenshot verification |
| Profile | `198:3648` | `src/app/profile/index.tsx` | To inspect |
| Records | `198:3722` | `src/app/fitness/records.tsx` | To inspect |
| Routine Editor | `198:3788` | `src/app/fitness/template/[id].tsx` | To inspect |

## Replica Backlog

The detailed screen-by-screen 1:1 replica checklist lives in [figma-replica-todo.md](figma-replica-todo.md).

## Explicit Gaps

The scope requires routes that have no named matching frame in this Figma section: AI food photo, micronutrients, wellness detail, weight, workout detail/repeat, weekly split, cardio, achievements, reminders, and all four article pages. Their layout must be held until matching frames are added or clarified.

The Figma file includes no named frames for the requested macro-range target-band state, portion dialog, or backup/restore flows.

## Design/Scope Discrepancies

- `03 Health — Hub` is titled `Nutrition` in its visible content. The build uses the request's rule: the Health tab opens Nutrition directly; there is no standalone Health hub.
- `09 Water Intake` is present in Figma and has been restored at `src/app/health/water.tsx`; its database table remains preserved.
- The fourth Figma tab label is `Life`; the implementation exposes `Life` while retaining the existing learning content route.
- The Customize Dashboard reference includes `Habits` and `Steps`; Figma is now the UI authority, so these need implementation or revised design frames before 1:1 completion can be claimed.