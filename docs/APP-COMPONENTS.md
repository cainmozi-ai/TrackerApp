# Incus — Complete Component & Feature Inventory

> Regenerated **19 September 2026** directly from the source tree at commit
> `61d7ae0` ("Remove Health hub — Health tab is Nutrition, drilling into
> micronutrients"). This supersedes the old root-level `FEATURES.txt`, written
> 11 June 2026, which is now out of date in name, colour scheme and navigation.

---

## 0. At a glance

| | |
|---|---|
| **App name** | Incus (formerly "Life Tracker") |
| **Package id** | `com.lifetracker.app` — never change it; a new id forces a reinstall and wipes user data |
| **Version** | 1.0.0 |
| **Platform** | Android-first — React Native + Expo SDK 56; web build used for testing |
| **Router** | Expo Router, file-based, `src/app/` (typed routes disabled — routes are plain strings) |
| **State** | Zustand — 14 stores in `src/stores/` |
| **Database** | SQLite on-device (`life-tracker.db`), 28 tables, no account, no cloud |
| **Design** | Dark-by-default charcoal with a single brand red `#A83232` |
| **Min Android** | SDK 26 |
| **Repo** | https://github.com/cainmozi-ai/TrackerApp |

Counts: **51 screens · 18 shared components · 14 stores · 6 services · 28 tables ·
190 seeded exercises · 50 seeded foods · 4 programs · 24 tracked micronutrients ·
17 achievements.**

---

## 1. Navigation map

Four bottom tabs (`src/app/(tabs)/_layout.tsx`):

| Tab | Route file | Icon | What it shows |
|---|---|---|---|
| **Home** | `(tabs)/index.tsx` | `home` | Dashboard |
| **Health** | `(tabs)/health.tsx` | `heart-pulse` | Renders `<NutritionScreen asTab />` — there is no Health hub any more; the icon goes straight to Nutrition |
| **Fitness** | `(tabs)/fitness.tsx` | `dumbbell` | Fitness hub with 8 module cards |
| **Learn** | `(tabs)/life.tsx` | `school` | Learn hub (the old Life tab, repurposed) |

Everything else is a pushed route. Profile sits at `/profile`, reached from the
Home header avatar.

### Full route list

```
(tabs)/index                       Home dashboard
(tabs)/health                      -> Nutrition (tab root)
(tabs)/fitness                     Fitness hub
(tabs)/life                        Learn hub
onboarding/index                   First-launch setup

health/nutrition/index             Nutrition day view
health/nutrition/search            Food search + log
health/nutrition/scan              Barcode scanner
health/nutrition/add-custom        Create a custom food
health/nutrition/ai-photo          AI photo recognition
health/micronutrients              Vitamins, minerals, wellness categories
health/wellness/[cat]              One wellness category in detail
health/weight                      Weight log + smoothed trend
health/sleep                       Sleep log
health/water                       Water / hydration          [unreachable]
health/steps                       Steps via Health Connect   [unreachable]
health/recovery                    Sauna, ice bath, mobility  [unreachable]
health/measurements                Body measurements + photos [unreachable]
health/coach                       Adaptive expenditure coach [unreachable]
health/meal-planner/index          Weekly meal plan           [unreachable]
health/meal-planner/shopping-list  Shopping list

fitness/active-workout             Live workout session
fitness/workout-summary            Post-workout summary
fitness/workout-detail             A past workout
fitness/exercise-library           Browse/filter 190 exercises
fitness/exercise-detail            One exercise + its history
fitness/template-builder           My routines
fitness/template/[id]              Edit one routine
fitness/programs                   4 levelled programs
fitness/progress                   Volume, set types, overload, charts
fitness/weekly-split               A routine per weekday
fitness/cardio                     Log runs, rides, rows
fitness/records                    PBs + strength standards

learn/nutrition                    Article
learn/myology                      Article
learn/biomechanics                 Article
learn/anatomy                      Article

life/tasks/index                   To-do list                 [unreachable]
life/tasks/add-task
life/habits/index                  Habits + heatmap           [unreachable]
life/habits/add-habit
life/habits/[id]
life/budget/index                  Money tracking             [unreachable]
life/budget/add-transaction
life/calendar                      Unified calendar           [unreachable]

profile/index                      Profile & settings
profile/achievements               17 achievements
profile/reminders                  Notification schedule
dashboard-customize                Home layout editor         [unreachable]
```

`[unreachable]` = the screen is fully built and routable, but nothing in the
current UI links to it. See §10.

---

## 2. Screens in detail

### 2.1 Onboarding — `onboarding/index.tsx`

Runs once on first launch, skippable. Collects name, goal (lose / maintain /
gain), sex, age, weight, height and activity level, then computes a plan with
**Mifflin–St Jeor**: BMR → TDEE (×1.2–1.9) → goal adjustment (−500 / 0 / +400,
floored at 1,200 kcal). Protein 2.0 g/kg (2.2 for muscle gain), fat 25% of
calories, carbs the remainder, water ~35 ml/kg as 250 ml glasses (clamped 6–14).
A live preview card updates as you type. Targets stay editable in Profile.

### 2.2 Home dashboard — `(tabs)/index.tsx`

Rebuilt to match the Figma design. Top to bottom:

- **Header** — uppercase long date, time-aware greeting (Good Morning /
  Afternoon / Evening), and a round red avatar button → `/profile`.
- **Nutrition card** (tap → Nutrition) — a 118 px SVG calorie ring showing
  calories eaten, "*n* / *target* kcal left", three macro bars (protein, carbs,
  fat) and three micro columns (fiber, sugar, sodium).
- **Weekly Workouts** (tap → Progress, with a "See All") — one bar per muscle
  group from `VOLUME_LANDMARKS`, showing sets done in the last 7 days, a status
  label ("below minimum — add sets", "in the sweet spot", "over max — consider a
  deload") and a tick marking MEV on the track.
- **Health Analytics** — a 2×2 grid: Weight (latest smoothed trend) → weight
  screen, Sleep (last night's duration) → sleep screen, Vitamins % ring and
  Minerals % ring → micronutrients.
- **Learn** — a daily rotating fact card (4 facts, indexed by day of month).

### 2.3 Nutrition — `health/nutrition/index.tsx`

Doubles as the Health tab root (the `asTab` prop hides the back arrow).

- **Hero card** (tap → micronutrients) — a 112 px calorie ring flanked by Fiber
  and Sugar bars, with Protein / Carbs / Fat bars underneath.
- **Day navigation** — step back and forward through dates.
- **Meals** — Breakfast, Lunch, Dinner, Snacks; each entry shows calories and
  macros, tap to edit servings or move meal, long-press to delete.
- **Save this day as a meal** — turns a day's foods into a reusable saved meal.
- **Copy yesterday** — duplicates the previous day's log.
- **FAB** → food search for the current date.

### 2.4 Food search — `health/nutrition/search.tsx`

Searchbar over the local library plus **Open Food Facts** online lookup. Tabs are
currently **Recent / Favorites / Meals**. A portion dialog logs by servings or by
amount (g/ml). Favourite toggling, quick-add of saved meals, and links out to the
barcode scanner, the AI photo screen and custom-food creation.

> **Known issue:** there is no **All** tab, so a food that scrolls out of Recent
> becomes hard to find again. `loadAllFoods()` now exists in the store; the tab
> itself is not wired up yet. See §10.

### 2.5 Barcode scanner — `health/nutrition/scan.tsx`

`expo-camera` scanner → `lookupBarcode()` against Open Food Facts → portion
dialog → log. Unknown barcodes hand off to the custom-food screen.

### 2.6 AI photo — `health/nutrition/ai-photo.tsx`

Photograph a meal; Gemini returns estimated foods and macros, which you confirm
before logging. Needs `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`; degrades gracefully
without it (`isAiConfigured()`).

### 2.7 Micronutrients — `health/micronutrients.tsx`

Two summary rings (Vitamins %, Minerals %), a **Wellness** grid of eight tappable
categories — Brainpower 🧠, Muscle & Performance 💪, Skin Hair & Nails ✨, Sleep &
Recovery 😴, Energy ⚡, Bone Health 🦴, Immune Function 🛡️, Hormones & Libido ❤️ —
then full per-nutrient lists: **14 vitamins** and **10 minerals**, each with
amount / RDA / % and a fill bar. Targets are NIH RDAs; the page carries a "not
medical advice" note.

### 2.8 Wellness category — `health/wellness/[cat].tsx`

Every nutrient feeding the chosen category, with amount, target, % and a
status-coloured bar (green ≥100%, amber ≥60%, red below). The Energy category
also shows calories against target.

### 2.9 Weight — `health/weight.tsx`

Log today's weight, see week / month / all-time changes, a **smoothed trend**
chart (exponentially weighted, so daily water swings don't dominate) and a list
of recent entries. Respects the kg/lb unit from Profile.

### 2.10 Sleep — `health/sleep.tsx`

Bed time / wake time → duration, quality rating, recent history.

### 2.11 Water, Steps, Recovery, Measurements, Coach, Meal Planner

All built, all currently unlinked:

- **Water** — glasses against target, quick add/remove.
- **Steps** — Health Connect integration (`react-native-health-connect` plus a
  permission-delegate config plugin), with a connect prompt when the provider
  isn't set up, day/week/month ranges and an average.
- **Recovery** — nine modalities: Sauna, Ice Bath, Cold Shower, Mobility, Foam
  Roll, Massage, Meditation, Walk, Nap; optional duration.
- **Measurements** — body measurements plus progress photos stored in
  `documentDirectory/progress-photos/`.
- **Coach** — the adaptive engine: estimates true expenditure from weight trend
  against intake and suggests target changes.
- **Meal planner** — plan meals across the week and roll them into a shopping
  list.

### 2.12 Fitness hub — `(tabs)/fitness.tsx`

A "Workout in progress" resume banner when a session is open, a "Today's split"
card when the weekday has a routine assigned, then eight module cards:
**Start Workout · Programs · My Routines · Exercise Library · Progress ·
Weekly Split · Cardio · Records**.

### 2.13 Active workout — `fitness/active-workout.tsx` (669 lines)

The biggest screen in the app.

- Live header stats: **Time · Exercises · Sets · Volume**.
- Custom **SetKeypad** for fast entry, with seven set types — normal, warmup,
  failure, drop, assisted, partial, static — each shown as a coloured dot.
  Warm-up sets are excluded from volume.
- **RestTimer** with suggested rest per exercise.
- **Plate calculator**.
- **Progression suggestions** — pulls your rep range, last performance and
  weight increment, then proposes the next load.
- **Circuits** — one-tap drop-in presets (Forearm Circuit, Biceps Burnout,
  Triceps Finisher, Core Circuit and more) that link the moves so you rotate
  with no rest.
- **"My gym's equipment only"** filter when adding exercises.
- Reorder exercises, edit or delete logged sets, backdate the session, discard.

### 2.14 Workout summary & detail

Post-session summary with PR detection (`detectPRs`), total volume and set
counts; `workout-detail` reopens any past session and can repeat it.

### 2.15 Exercise library & detail

190 exercises across Arms (35), Back (31), Core (28), Legs (26), Chest (20),
Cardio (20), Shoulders (19), Glutes (11). Each carries target muscle, primary and
secondary muscles, mechanic (compound/isolation), region, equipment, description
and form tips. The detail screen adds last top weight, estimated 1RM, session
count, an editable **weight jump** for that exercise, last session's sets and a
top-weight history chart.

### 2.16 Programs & routines

Four levelled programs — **Foundations** (beginner, 3-day full body),
**Minimalist** (beginner, 2-day), **Upper / Lower Builder** (intermediate,
4-day), **Push / Pull / Legs** (advanced, 6-day) — cloneable into your own
routines. The template builder handles creating, reordering, per-exercise target
sets / reps / rep-range, and deletion.

### 2.17 Progress — `fitness/progress.tsx`

- **Weekly volume · sets vs landmarks** — per-muscle bars against MEV/MAV/MRV.
- **Sets by type · 30 days** — the breakdown across the seven set types.
- **Progressive Overload** — per-exercise suggestions, with "apply to routine"
  writing the new weight back into the template.
- **Exercise Progress** — max-weight chart per exercise.
- **Recent Workouts** list.

### 2.18 Weekly split — `fitness/weekly-split.tsx`

Assign a routine (or rest) to each weekday; today is highlighted and tappable to
start that session. Feeds both the Fitness hub card and the workout reminder.

### 2.19 Cardio — `fitness/cardio.tsx`

Tile grid of the 20 cardio exercises to start a session, plus a recent list with
duration and distance.

### 2.20 Records — `fitness/records.tsx`

- **Strength standards** — for Bench, Squat, Deadlift, Overhead Press and Row,
  your estimated 1RM ÷ bodyweight placed on an Untrained → Novice →
  Intermediate → Advanced → Elite scale, with separate male/female thresholds
  and the ratio needed for the next level.
- **Personal bests** — best estimated 1RM per exercise.

### 2.21 Learn — `(tabs)/life.tsx` + `learn/*`

Hub with four article cards: **Nutrition · Myology · Biomechanics · Basic
Anatomy**. All four render through the shared `ArticleScreen`, which lays out an
intro plus sections of prose and term/definition bullets.

### 2.22 Life modules (Tasks, Habits, Budget, Calendar)

Still fully implemented but no longer linked from a tab:

- **Tasks** — due dates, priorities, completion.
- **Habits** — daily ticks, streaks and a GitHub-style `HabitHeatmap`.
- **Budget** — transactions by category against a monthly budget.
- **Calendar** — one view marking workouts, meals, tasks, habits and weigh-ins
  (`services/calendarData.ts`).

### 2.23 Profile — `profile/index.tsx`

Level card (Lv. *n* + XP) → **View Achievements**; **Appearance** (dark mode
switch); **Notifications** → Reminders; **About You** (name, age, height, weight
unit kg/lb); **My Gym Equipment** (multi-select, drives the equipment filter);
**Daily Targets** (calories, protein, carbs, fat, fiber, sugar, sodium, water
glasses, monthly budget); **Data & Backup**; version footer.

### 2.24 Reminders — `profile/reminders.tsx`

Four schedulable local notifications via `expo-notifications`:

| Reminder | Default | Fires |
|---|---|---|
| Workout reminder | 17:30 | Only on days with a routine in the Weekly Split |
| Daily habits | 20:00 | Nudge to tick habits |
| Hydration | 14:00 | Drink water |
| Streak check | 20:30 | "Keep your streak alive" |

### 2.25 Achievements & XP

17 seeded achievements with XP rewards; 10 level names — Beginner → Apprentice →
Dedicated → Committed → Advanced → Elite → Master → Champion → Legend → Mythic.

### 2.26 Customize dashboard — `dashboard-customize.tsx`

Reorder / hide Home sections, choose muscle-group cards, pick the exercise-card
metric and set weekly targets (muscles, sets, exercises). Currently unlinked.

---

## 3. Shared components — `src/components/`

| Component | Importers | Purpose |
|---|---|---|
| `common/ScreenHeader` | 36 | Title bar with optional back arrow (`showBack`) and a right slot |
| `common/MotionCard` | 12 | Card with a staggered `FadeInUp` entrance (`noEnter` to disable) |
| `common/EmptyState` | 7 | Icon + title + optional action for empty lists |
| `common/ProgressRing` | 5 | SVG ring with a centre value/label |
| `common/AppCard` | 2 | Big tappable module card (icon, title, subtitle, colour) |
| `common/SectionHeader` | 2 | Section title row |
| `common/CategoryIconPicker` | 1 | Icon chooser for budget categories |
| `common/QuickActionFab` | **0** | Expanding FAB — currently unused |
| `common/StatTile` | **0** | Stat tile — currently unused |
| `dashboard/MiniCharts` | 1 | Small sparkline / bar charts |
| `habits/HabitHeatmap` | 1 | Year heatmap of habit completions |
| `habits/HabitTile` | 1 | Habit row with streak |
| `learn/ArticleScreen` | 4 | Shared article layout for the Learn tab |
| `workout/MuscleMap` | 1 | Body map shaded by weekly volume |
| `workout/SetKeypad` | 1 | Fast set entry + the 7 set types |
| `workout/RestTimer` | 1 | Countdown between sets |
| `workout/PlateCalculator` | 1 | Which plates to load per side |
| `workout/WorkoutDateDialog` | 1 | Backdate a session |

---

## 4. Stores — `src/stores/` (Zustand)

| Store | Responsibility |
|---|---|
| `userStore` | Profile, targets, units, gym equipment, XP / level |
| `nutritionStore` | Day logs, totals (calories, macros, fiber, sugar, sodium, micros), recents, favourites, all foods, saved meals, custom foods, search, copy-yesterday |
| `workoutStore` | 47 actions — exercises, templates, programs, weekly schedule, live sessions, sets, PRs, progression, volume, cardio, history |
| `weightStore` | Entries + smoothed trend series |
| `sleepStore` | Nightly sleep |
| `waterStore` | Glasses per day |
| `recoveryStore` | Recovery modalities |
| `measurementStore` | Body measurements + photos |
| `mealPlanStore` | Weekly plan + shopping list |
| `taskStore` | To-dos |
| `habitStore` | Habits + completions |
| `budgetStore` | Transactions + categories |
| `gamificationStore` | Achievements, unlocking, XP rewards |
| `reminderStore` | Reminder schedule + notification scheduling |

---

## 5. Domain data & logic

**`src/data/`**

- `exercises.json` — 190 exercises with full muscle / equipment metadata
- `foods.json` — 50 starter foods
- `programs.json` — 4 levelled programs
- `volumeLandmarks.ts` — MEV / MAV / MRV per muscle group + `volumeStatus()`
- `strengthStandards.ts` — bodyweight-ratio thresholds for 5 barbell lifts, male
  and female, + `assessStrength()`
- `circuits.ts` — body-part circuit presets

**`src/utils/`**

- `calories.ts` — Mifflin–St Jeor, TDEE, macro splits
- `micronutrients.ts` — 24 nutrient definitions with RDAs, 8 wellness categories,
  `percentOf` / `groupPercent` / `categoryPercent`
- `progression.ts` — `defaultIncrement()` by equipment (dumbbell 2 kg,
  machine/cable 5 kg, barbell 2.5 kg, kettlebell 4 kg, bodyweight/band 1 kg) and
  `effectiveIncrement()` honouring a per-exercise override
- `workout.ts` — 1RM estimation, volume, set helpers
- `muscles.ts` — muscle grouping and map regions
- `dashboard.ts` — Home layout config
- `dates.ts` — date helpers

---

## 6. Services — `src/services/`

| Service | Does |
|---|---|
| `openFoodFacts.ts` | `searchOpenFoodFacts()`, `lookupBarcode()` |
| `aiRecognition.ts` | Gemini meal photo → foods/macros (`isAiConfigured`, `recognizeFoodFromPhoto`, `recognizedToFood`) |
| `healthConnect.ts` (+ `.web.ts` stub) | Android Health Connect steps: availability, permission, connect, daily steps, open settings |
| `backup.ts` | `buildBackupJson`, `exportBackup`, `pickBackupFile`, `importBackup` — full JSON export/import of every table |
| `calendarData.ts` | `getMarkedDates`, `getDaySummary` for the unified calendar |

---

## 7. Database — `src/database/schema.ts`

28 tables:

```
user_profile      foods             food_logs         meal_plans
shopping_list     saved_meals       saved_meal_items  water_logs
sleep_logs        recovery_logs     weekly_schedule   reminders
weight_logs       exercises         workout_templates template_exercises
workout_logs      workout_sets      tasks             habits
habit_logs        transactions      budget_categories achievements
xp_logs           body_measurements progress_photos   events
```

Seeding: exercises (re-seeds when the bundled set gains data the DB lacks),
17 achievements, and starter templates.

**Migration rule — schema changes must be additive.** New tables use
`CREATE TABLE IF NOT EXISTS`; new columns are `ALTER TABLE` statements appended
to `runMigrations`. Only "duplicate column" errors are swallowed, everything else
throws. Never drop or rename a column in place — installed copies of the app hold
real user data.

---

## 8. Design system — `src/theme/index.ts`

- **Brand red `#A83232`** (dim variant `#8A2828`) as the single accent. The
  constants are still named `GREEN` / `GREEN_DIM` from the previous palette — the
  values are red.
- **Dark (default):** background `#121212`, surface `#1C1C1E`, surfaceVariant
  `#2A2A2C`, outline `#323234`, primaryContainer `#3A1210`, onPrimaryContainer
  `#F3D0D0`.
- **Light:** containers `#F5D6D6` / `#3A0A0A`.
- **Semantic status colours** stay independent of the brand: green `#66BB6A` (on
  target), amber `#FFA726` (partial), red `#FF6B6B` (low).
- **Typography:** system font, MD3 scale tightened for data density —
  displayLarge 54 / headlineMedium 26 / titleMedium 16 / bodyMedium 14 /
  labelSmall 11, weights 400–700.
- **Motion:** `react-native-reanimated` `FadeInUp` / `FadeInDown` entrances,
  staggered by card index.
- Built on **react-native-paper** (MD3) with `react-native-svg` for rings, bars
  and charts.

---

## 9. Build & deployment

- **EAS cloud builds** — the `preview` profile produces an installable APK.
  `appVersionSource: remote` + `autoIncrement` bumps versionCode each build, so
  every APK installs as an in-place update and keeps user data.
- `.npmrc` sets `legacy-peer-deps=true` (React 19 peer conflicts).
- Build: `npx eas-cli build -p android --profile preview`.
- **Web testing:** `npx expo start --web`, then `http://127.0.0.1:8081`
  (`localhost` can hang on IPv6). Expo Go does **not** support SDK 56.
- **Permissions:** camera, microphone, Health Connect read-steps.
- **Plugins:** expo-router, status-bar, sqlite, camera, font, sharing, audio,
  asset, notifications (accent `#A83232`), react-native-health-connect, a custom
  `withHealthConnectPermissionDelegate`, build-properties (minSdk 26).
- **Data survives updates:** SQLite and progress photos live in app-private
  storage; only an uninstall clears them.

---

## 10. Known gaps as of this snapshot

1. **11 screens have no entry point.** Removing the Health hub and converting the
   Life tab to Learn left Water, Steps, Recovery, Measurements, Coach, Meal
   Planner, Tasks, Habits, Budget, Calendar and Customize Dashboard built but
   unreachable. They need either new entry points or a deliberate decision to
   retire them.
2. **Food search has no "All" tab** — foods drop out of reach once they leave
   Recent. `loadAllFoods()` exists in `nutritionStore`; `search.tsx` still only
   offers Recent / Favorites / Meals.
3. **Home Weight and Sleep analytics** are plain stat cards and don't match the
   Figma treatment.
4. **Macro ranges** (a min–max instead of a single target) are not implemented —
   targets are single numbers in `user_profile`.
5. **Two unused components** — `QuickActionFab` and `StatTile`.
6. Theme constants are still named `GREEN` / `GREEN_DIM` despite holding red
   values — cosmetic, but misleading when reading the file.
