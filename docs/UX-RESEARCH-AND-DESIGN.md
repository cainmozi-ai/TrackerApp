# Life Tracker — UX/UI Research & Best-Fit Design System

A teardown of the leading apps in each category we cover, the specific UX/UI
patterns worth stealing, and the consolidated **best-fit design direction** for
this app. This is the north-star reference for the Material 3 Expressive overhaul.

---

## 1. Competitor teardown (what to copy / what to avoid)

### Nutrition

**MyFitnessPal — the cautionary tale.** The 2026 redesign buried the core action
(the daily food log) on a secondary screen, stuffed important items into a "More"
menu, and added clutter; users revolted.
→ **Avoid:** hiding the primary action; deep menus; dense chrome.

**Cal AI — the modern benchmark.**
- AI camera that identifies a meal from a photo, **plus** barcode scan **plus**
  nutrition-label scan — one capture surface, three modes, near-zero friction.
- Dashboard shows the key metrics (calories, macros) big, and you **swipe to
  reveal secondary metrics** (fiber, sodium) instead of cramming them in.
- **Animated badges** for streaks (logging, water) make it feel rewarding.
- **Detailed onboarding → personalized daily targets** for calories + macros.
→ **Copy:** multi-mode capture, swipeable primary/secondary metric cards,
  onboarding-driven personalized targets, reward animations.

**Fast-logger insight (Calorie Tracker Buddy et al.):** people eat the same
meals on repeat — a 3-item meal should log in **under 30 seconds** via
**Recents + Saved Meals + "copy yesterday."** Search is the fallback, not the
default.

### Workouts

**Strong** — "the gym notebook, perfected." Log a set in **2 taps**, the cleanest
UI in the category, auto rest-timer between sets, zero social noise.
**Hevy** — same logging speed + a browsable exercise library, native supersets /
drop sets, and a light social/PR feed for accountability.
→ **Copy:** 2-tap set logging with prefilled numbers, **auto-start rest timer on
  set completion**, clean exercise library.

### Habits

**Streaks** — a grid of **circular icons; tap to fill; streak number ticks up.**
The entire interaction is one tap. "The best habit tracker takes less time than
the habit itself."
**Finch** — *cozy, gentle, non-judgmental*. Skeuomorphic virtual-pet companion;
**calming colors**; a **single consistent green CTA** anchored bottom-of-screen
across every screen (predictable target). Onboarding = name/customize your bird.
Caveat from teardowns: its home screen *can get busy* — goals + pet + adventures
compete; **information hierarchy must stay calm.**
**Habitica** — full RPG gamification (XP, levels, gold, loot).
→ **Copy:** circular tap-to-complete tiles + streaks (Streaks), warm
  reward-not-punish tone + consistent primary CTA (Finch), XP/levels/achievements
  (Habitica). **Heed the warning:** keep our bento dashboard calm, not crowded.

### Budget

**Mobills / 1Money / Copilot** — **large colorful category icons** make logging
fast and scannable; **green = income, red = expense**; pie + trend charts turn
numbers into at-a-glance patterns.
→ **Copy:** category icon picker for entry, iconified colored rows, pie + trend.

### Productivity / structure

**Apple Health & Activity Rings** — the clarity benchmark.
- 3 rings (Move/Exercise/Stand), **fixed colors**, **always on a black
  background**, generous margins; rings **convey information, never decoration.**
- Card-based, glanceable, calm hierarchy.
→ **Copy:** rings/charts are informational and high-contrast; consider a dark
  "today's rings" hero card; don't sprinkle rings as ornament.

---

## 2. Pattern → application matrix

| Pattern | Source | Where it lands in our app |
|---|---|---|
| Never bury the core action | MFP (anti) | Dashboard tiles + per-meal "+", quick-action FAB (≤2 taps) |
| Multi-mode capture (photo/barcode/label) | Cal AI | Nutrition: AI photo + barcode scanner + search |
| Recents / Saved Meals / Copy-Yesterday | fast loggers | Nutrition search default view + daily-log actions |
| Swipeable primary→secondary metrics | Cal AI | Nutrition hero card (cal+macros, swipe to micros) |
| 2-tap set log + auto rest timer | Strong/Hevy | Active workout |
| Circular tap-to-fill tiles + streaks | Streaks | Habits grid |
| Warm, non-judgmental copy + consistent CTA | Finch | Microcopy + primary button placement everywhere |
| XP / levels / achievements | Habitica | Already built — surfaced on dashboard/profile |
| Big colorful category icons | Mobills | Budget entry + rows |
| Informational rings, calm hierarchy | Apple Health | ProgressRing usage; bento dashboard kept calm |
| Onboarding → personalized targets | Cal AI/MFP | 5–6 step onboarding + TDEE calc |

---

## 3. Best-fit design system (the decision)

**Personality:** a **hybrid** — Apple-Health **clarity** + Strong/Hevy **fast
logging** + Finch/Habitica **warmth & gamification**, expressed in **Material 3
Expressive** (vibrant-but-accessible color, spring motion, bento cards,
expressive shape/type). This matches the brief ("colorful & modern," Android-first)
and our stack (React Native Paper = MD3, Reanimated installed).

### Tokens (implemented in `src/theme/index.ts`)
- **Color:** vibrant `moduleColors` (nutrition pink, water blue, sleep violet,
  workout coral, tasks amber, habits green, budget teal, gamification gold) over a
  soft near-white (light) / deep violet-black (dark) ground. Full **light + dark**
  palettes; `withAlpha()` for tonal containers.
- **Shape:** rounder, expressive — `sm 12 / md 20 / lg 28 / xl 36 / pill`.
- **Type:** larger, bolder display & headline; legible body.
- **Motion:** spring presets — `snappy / smooth / bouncy` — via Reanimated
  (press-scale on cards, list entrances, FAB).
- **Spacing:** `xs 4 … xxl 48`.

### Component language (`src/components/common/`)
`ScreenHeader` (consistent), `EmptyState` (warm CTA), `MotionCard` (spring press +
entrance), `StatTile` (bento), `CategoryIconPicker` (budget), upgraded
`AppCard / ProgressRing / SectionHeader / QuickActionFab`.

### Guardrails (from the teardowns)
1. **Keep the dashboard calm** (Finch's mistake) — bento tiles with clear
   hierarchy, not everything shouting at once.
2. **Logging is ≤2 taps** (Strong/Cal AI) — recents/saved/auto-fill first.
3. **Reward, never punish** (Finch) — celebratory toasts, no guilt empty states.
4. **Rings/charts inform, don't decorate** (Apple).

---

## 4. Status

This direction is **approved and in build** (Material 3 Expressive overhaul plan).
Phase 1 (tokens, theme context + dark mode, shared components, TDEE utils) is
underway; Nutrition is the first module to receive the full treatment.

### Sources
- MyFitnessPal redesign backlash — piunikaweb, Medium UX case study
- Cal AI teardown — screensdesign.com, Behance
- Strong vs Hevy — setgraph.app, sensai.fit
- Streaks / Finch / Habitica — gridfiti.com, Finch UX teardown (Medium), IXD@Pratt
- Budget UI — getfinny.app
- Apple Activity Rings — Apple Human Interface Guidelines
- Material 3 Expressive — m3.material.io, Muzli
