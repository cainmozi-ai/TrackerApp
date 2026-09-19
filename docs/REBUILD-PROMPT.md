# Incus — Full Rebuild Prompt

**How to use:** open an empty folder in VS Code, start Claude Code (or your agent of
choice) in it, and paste everything from `--- BEGIN PROMPT ---` to
`--- END PROMPT ---`. Work through the phases in order; each has a checkpoint you must
pass before moving on.

---

--- BEGIN PROMPT ---

# Build "Incus" — a private, offline-first Android life-tracking app

You are building a complete React Native + Expo application from scratch. Read this
entire brief before writing any code. Build it in the phase order given at the end.

## 0. Mission

Incus is a single-user, **offline-first** Android app that tracks nutrition, training,
body metrics and daily life. No accounts, no cloud, no telemetry — every byte lives in
a local SQLite database on the device. It is data-dense and dark by default, built
around one brand red on charcoal.

Design values, in priority order:

1. **Data integrity.** The user's history is irreplaceable. Schema changes are always
   additive; nothing is ever dropped, renamed in place, or silently migrated away.
2. **Speed of logging.** Logging a set or a meal should take seconds. Custom keypads
   over stock inputs, sensible defaults, one-tap repeats.
3. **Density with calm.** Lots of numbers, one accent colour, generous but not airy
   spacing, restrained motion.
4. **Honesty.** Estimates are labelled as estimates. Anything health-adjacent carries a
   "not medical advice" note.

## 1. Stack — use these exact versions

Expo SDK 56 changed a great deal. **Read https://docs.expo.dev/versions/v56.0.0/ before
writing code** and do not rely on pre-SDK-56 memory.

```json
{
  "name": "incus",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo/metro-runtime": "~56.0.15",
    "@expo/vector-icons": "^15.0.2",
    "expo": "~56.0.11",
    "expo-asset": "~56.0.17",
    "expo-audio": "~56.0.12",
    "expo-build-properties": "~56.0.19",
    "expo-camera": "~56.0.8",
    "expo-constants": "~56.0.16",
    "expo-document-picker": "~56.0.4",
    "expo-file-system": "~56.0.8",
    "expo-font": "~56.0.5",
    "expo-haptics": "~56.0.3",
    "expo-image-picker": "~56.0.17",
    "expo-linking": "~56.0.14",
    "expo-notifications": "~56.0.25",
    "expo-router": "~56.2.10",
    "expo-sharing": "~56.0.17",
    "expo-sqlite": "~56.0.5",
    "expo-status-bar": "~56.0.4",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.85.3",
    "react-native-calendars": "^1.1314.0",
    "react-native-chart-kit": "^6.12.3",
    "react-native-gesture-handler": "~2.31.1",
    "react-native-health-connect": "^3.5.3",
    "react-native-paper": "^5.15.3",
    "react-native-reanimated": "4.3.1",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "4.25.2",
    "react-native-svg": "15.15.4",
    "react-native-view-shot": "5.1.0",
    "react-native-web": "^0.21.2",
    "react-native-worklets": "0.8.3",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@types/react": "~19.2.2",
    "typescript": "~6.0.3"
  }
}
```

Install with `npm install --legacy-peer-deps` (React 19 peer conflicts).

## 2. Configuration files — create these verbatim

**`.npmrc`**
```
legacy-peer-deps=true
```

**`tsconfig.json`**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"], "@/assets/*": ["./assets/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

**`metro.config.js`** — required or `expo-sqlite` will not work in the web build you
test against.
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// expo-sqlite on web bundles a WebAssembly build of SQLite (wa-sqlite).
config.resolver.assetExts.push('wasm');

// wa-sqlite needs SharedArrayBuffer, which needs COOP/COEP headers.
config.server = config.server || {};
const previous = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const base = previous ? previous(metroMiddleware, server) : metroMiddleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return base(req, res, next);
  };
};

module.exports = config;
```

**`app.json`**
```json
{
  "expo": {
    "name": "Incus",
    "slug": "incus",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "incus",
    "userInterfaceStyle": "automatic",
    "android": {
      "package": "com.incus.app",
      "allowBackup": true,
      "adaptiveIcon": {
        "backgroundColor": "#121212",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.health.READ_STEPS"
      ]
    },
    "web": { "output": "single", "favicon": "./assets/favicon.png" },
    "plugins": [
      "expo-router",
      "expo-status-bar",
      "expo-sqlite",
      ["expo-camera", { "cameraPermission": "Allow Incus to access your camera for barcode scanning." }],
      "expo-font",
      "expo-sharing",
      "expo-audio",
      "expo-asset",
      ["expo-notifications", { "color": "#A83232" }],
      "react-native-health-connect",
      "./plugins/withHealthConnectPermissionDelegate",
      ["expo-build-properties", { "android": { "minSdkVersion": 26 } }]
    ],
    "extra": { "router": {} }
  }
}
```

> **Pick the `android.package` now and never change it.** A different package id or
> signing key means a fresh install, which wipes the user's entire history.

**`eas.json`**
```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "android": { "buildType": "apk" } },
    "preview": { "distribution": "internal", "autoIncrement": true, "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true, "android": { "buildType": "app-bundle" } }
  },
  "submit": { "production": {} }
}
```

`appVersionSource: remote` + `autoIncrement` means EAS bumps versionCode every build,
so each APK installs as an in-place update and preserves user data.

## 3. Project structure

Expo Router uses **`src/app/`**, not a root `app/`. Entry point is
`"main": "expo-router/entry"` — there is no `App.tsx` or `index.ts`.

```
src/
├── app/                      # Expo Router routes (see §7)
├── components/
│   ├── common/               # ScreenHeader, MotionCard, EmptyState, ProgressRing,
│   │                         #   AppCard, SectionHeader, CategoryIconPicker
│   ├── dashboard/            # MiniCharts
│   ├── habits/               # HabitHeatmap, HabitTile
│   ├── learn/                # ArticleScreen
│   └── workout/              # MuscleMap, SetKeypad, RestTimer, PlateCalculator,
│                             #   WorkoutDateDialog
├── data/                     # exercises.json, foods.json, programs.json,
│                             #   volumeLandmarks.ts, strengthStandards.ts, circuits.ts
├── database/                 # schema.ts, DatabaseProvider.tsx
├── services/                 # openFoodFacts, aiRecognition, healthConnect(+.web),
│                             #   backup, calendarData
├── stores/                   # 14 Zustand stores
├── theme/                    # index.ts, ThemeContext.tsx
├── types/                    # index.ts
└── utils/                    # calories, micronutrients, progression, workout,
                              #   muscles, dashboard, dates
plugins/
└── withHealthConnectPermissionDelegate.js
```

**Disable typed routes.** They break dynamic routes in this setup — all routes are
plain strings. Use the classic `Tabs` from `expo-router`, not NativeTabs.

## 4. Theme — `src/theme/index.ts`

One brand accent on charcoal. Build the palette exactly as below.

```ts
const BRAND = '#A83232';       // brand red
const BRAND_DIM = '#8A2828';   // light-mode primary
```

**Dark (default):**
```
primary #A83232   primaryContainer #3A1210   onPrimary #FFFFFF   onPrimaryContainer #F3D0D0
secondary #9AA0A6 secondaryContainer #2A2A2C onSecondaryContainer #E3E3E6
tertiary #A83232  tertiaryContainer #3A1210  onTertiaryContainer #F3D0D0
background #121212  surface #1C1C1E  surfaceVariant #2A2A2C
onBackground #F2F2F4  onSurface #F2F2F4  onSurfaceVariant #9A9AA0
outline #323234  outlineVariant #262628  error #FF6B6B  errorContainer #3A1A1A
elevation: level1 #1C1C1E, level2 #222224, level3 #262628, level4 #2A2A2C, level5 #2E2E30
```

**Light:**
```
primary #8A2828  primaryContainer #F5D6D6  onPrimaryContainer #3A0A0A
secondary #5F6368  secondaryContainer #ECEDEF
background #FAFAFA  surface #FFFFFF  surfaceVariant #F0F1F2
onBackground #17181A  onSurface #17181A  onSurfaceVariant #5F6368
outline #DADCE0  outlineVariant #E8EAED  error #D7373F  errorContainer #FFDAD6
```

**Semantic status colours** — independent of the brand, used for every progress bar,
ring and status label: green `#66BB6A` (on target), amber `#FFA726` (partial), red
`#FF6B6B` (low). Do not replace these with the brand red; the user needs to read
"good/warning/bad" at a glance.

**Typography** — `configureFonts` over the system font, MD3 scale tightened for
density:
```
displayLarge 54/700/-0.5   displayMedium 44/700/-0.25  displaySmall 34/700/0
headlineLarge 30/700/-0.25 headlineMedium 26/700/0     headlineSmall 22/700/0
titleLarge 20/700/0        titleMedium 16/600/0.1      titleSmall 14/600/0.1
bodyLarge 16/400/0.15      bodyMedium 14/400/0.2       bodySmall 12/400/0.3
labelLarge 14/600/0.1      labelMedium 12/600/0.4      labelSmall 11/600/0.4
```

**Also export:**
```ts
export const accent = BRAND;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const shape = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const motion = {
  snappy: { damping: 24, stiffness: 320, mass: 0.8 },
  smooth: { damping: 22, stiffness: 200, mass: 1 },
  bouncy: { damping: 18, stiffness: 220, mass: 0.9 },
};
export function withAlpha(hex: string, alpha: number): string; // 6-digit hex + 0–1 → 8-digit hex
```

`ThemeContext.tsx` exposes `useAppTheme()` returning `{ colors, dark, toggle }`, backed
by react-native-paper's `PaperProvider` and persisting the choice to `user_profile.theme_pref`.
Every screen reads colours from `useAppTheme()` — never hard-code a neutral.

## 5. Database — `src/database/schema.ts`

SQLite via `expo-sqlite`, file `incus.db` on native, in-memory on web. Export a single
`getDatabase()` that opens once, runs `runMigrations()`, then seeds.

### Tables (28)

```
user_profile        foods              food_logs          meal_plans
shopping_list       saved_meals        saved_meal_items   water_logs
sleep_logs          recovery_logs      weekly_schedule    reminders
weight_logs         exercises          workout_templates  template_exercises
workout_logs        workout_sets       tasks              habits
habit_logs          transactions       budget_categories  achievements
xp_logs             body_measurements  progress_photos    events
```

`user_profile` is a single row (`id INTEGER PRIMARY KEY DEFAULT 1`) holding:
`name, age, weight, height, activity_level, goal, sex, calorie_target (2000),
protein_target (150), carbs_target (250), fat_target (65), fiber_target (30),
sugar_target (50), sodium_target (2300), water_target (8), monthly_budget,
weight_unit ('kg'), theme_pref ('dark'), onboarded (0), xp (0), level (1),
created_at, updated_at`.

Other shapes worth getting right up front:

- `exercises` — `name, muscle_group, target, primary_muscles (JSON), secondary_muscles
  (JSON), mechanic, region, log_type, equipment, description, tips (JSON), is_custom,
  weight_increment` (nullable per-exercise override).
- `workout_sets` — `workout_id, exercise_id, set_number, weight, reps,
  duration_seconds, distance, rpe, set_type`.
- `template_exercises` — `template_id, exercise_id, position, target_sets, target_reps,
  rep_range_min, rep_range_max, target_weight`.
- `food_logs` — `food_id, date, meal, servings, amount, unit` plus denormalised
  calories/macros so history survives a food being edited.
- `foods` — macros per serving **and** per 100 g, `barcode`, `is_custom`,
  `is_favorite`, plus a micronutrient JSON blob.

### The migration rule — non-negotiable

New tables use `CREATE TABLE IF NOT EXISTS`. New columns are `ALTER TABLE ... ADD
COLUMN` statements **appended** to `runMigrations()`, wrapped so that only a
"duplicate column" error is swallowed — every other error must throw. Never drop or
rename a column in place. Installed copies of the app hold real, unbacked-up user data.

### Seeding

- **190 exercises** across Arms (35), Back (31), Core (28), Legs (26), Chest (20),
  Cardio (20), Shoulders (19), Glutes (11). Re-seed when the bundled set has fields the
  DB lacks (check for a NULL `primary_muscles`), updating existing rows by name rather
  than duplicating them.
- **50 starter foods** with full macros.
- **4 programs** (see §6).
- **17 achievements** with XP rewards.
- Starter workout templates.

## 6. Domain data and formulas

**`utils/calories.ts` — Mifflin–St Jeor.**
BMR from sex/weight/height/age → TDEE = BMR × activity multiplier (1.2 sedentary …
1.9 very active) → goal adjustment: −500 (lose) / 0 (maintain) / +400 (gain), floored
at 1,200 kcal. Protein 2.0 g/kg bodyweight (2.2 for muscle gain), fat 25% of calories,
carbs the remainder. Water ≈ 35 ml/kg expressed as 250 ml glasses, clamped 6–14.

**`data/volumeLandmarks.ts` — weekly hard sets per muscle group.** MEV = minimum to
grow, MAV = productive middle, MRV = recoverable maximum. These are original rounded
rules of thumb, not copied from any proprietary source.

| Muscle | MEV | MAV | MRV |
|---|---|---|---|
| Chest | 8 | 16 | 22 |
| Back | 10 | 18 | 25 |
| Shoulders | 8 | 18 | 26 |
| Legs | 8 | 16 | 20 |
| Glutes | 4 | 12 | 16 |
| Arms | 8 | 16 | 24 |
| Core | 6 | 14 | 22 |

`volumeStatus(sets, landmark)` → `under` "below minimum — add sets" / `low`
"productive — room to add" / `optimal` "in the sweet spot" / `over` "over max —
consider a deload".

**`data/strengthStandards.ts` — est-1RM ÷ bodyweight thresholds** for entry to
Novice / Intermediate / Advanced / Elite (below the first = Untrained). Original
rounded figures.

| Lift | Male | Female |
|---|---|---|
| Barbell Bench Press | 0.75 / 1.0 / 1.5 / 2.0 | 0.4 / 0.6 / 0.9 / 1.2 |
| Back Squat | 1.0 / 1.5 / 2.0 / 2.5 | 0.6 / 1.0 / 1.4 / 1.8 |
| Deadlift | 1.25 / 1.75 / 2.25 / 2.75 | 0.75 / 1.2 / 1.6 / 2.0 |
| Overhead Press | 0.5 / 0.7 / 0.9 / 1.2 | 0.3 / 0.45 / 0.6 / 0.8 |
| Barbell Row | 0.6 / 0.85 / 1.15 / 1.5 | 0.4 / 0.6 / 0.85 / 1.1 |

**`utils/progression.ts` — smallest sensible weight jump by equipment:** dumbbell 2 kg,
machine/cable/smith/leverage 5 kg, barbell/EZ/trap 2.5 kg, kettlebell 4 kg,
bodyweight/band 1 kg, fallback 2.5 kg. A per-exercise override always wins
(`effectiveIncrement`).

**`utils/micronutrients.ts`** — 14 vitamins and 10 minerals, each with an NIH RDA and
unit, plus 8 wellness categories each nutrient can belong to: Brainpower 🧠, Muscle &
Performance 💪, Skin Hair & Nails ✨, Sleep & Recovery 😴, Energy ⚡, Bone Health 🦴,
Immune Function 🛡️, Hormones & Libido ❤️. Helpers: `percentOf`, `groupPercent`,
`categoryPercent`.

**`data/circuits.ts`** — body-part circuit presets that drop a group of exercises into
a session in one tap and link them so you rotate with no rest. Match exercise names
case-insensitively against the library and skip any that aren't found. Include at
least: Forearm Circuit (Reverse Curl, Wrist Curl, Hammer Curl), Biceps Burnout
(Barbell Curl, Hammer Curl, Concentration Curl), Triceps Finisher (Tricep Pushdown,
Tricep Kickback), Core Circuit (Plank, Hollow Body Hold, Dead Bug, Mountain Climber).

**`data/programs.json`** — Foundations (beginner, 3-day full body), Minimalist
(beginner, 2-day), Upper / Lower Builder (intermediate, 4-day), Push / Pull / Legs
(advanced, 6-day). Each cloneable into the user's own routines.

**Gamification** — 10 levels: Beginner → Apprentice → Dedicated → Committed → Advanced
→ Elite → Master → Champion → Legend → Mythic.

## 7. Screens

Four bottom tabs in `src/app/(tabs)/_layout.tsx`:

| Tab | Icon | Content |
|---|---|---|
| Home | `home` | Dashboard |
| Health | `heart-pulse` | The Nutrition screen rendered as a tab root — **there is no Health hub** |
| Fitness | `dumbbell` | Fitness hub, 8 module cards |
| Learn | `school` | Learn hub, 4 articles |

Profile lives at `/profile`, reached from the Home header avatar.

### Home — `(tabs)/index.tsx`

- **Header:** uppercase long date, time-aware greeting (Good Morning / Afternoon /
  Evening), round brand-red avatar button → `/profile`.
- **Nutrition card** (tap → Nutrition): a 118 px SVG calorie ring, "*n* / *target* kcal
  left", macro bars (protein, carbs, fat), micro columns (fiber, sugar, sodium).
- **Weekly Workouts** (tap → Progress, "See All" link): one bar per muscle group,
  sets in the last 7 days against MEV/MAV/MRV, status label, and a tick marking MEV on
  the track.
- **Health Analytics:** 2×2 grid — Weight (latest smoothed trend), Sleep (last night),
  Vitamins % ring, Minerals % ring.
- **Learn:** a daily rotating fact card.
- Sections are reorderable/hideable from a Customize Dashboard screen — **link that
  screen from the Home header**, don't leave it stranded.

### Health / Nutrition

- **`health/nutrition/index.tsx`** — doubles as the Health tab root via an `asTab` prop
  that hides the back arrow. Hero card (tap → micronutrients): a 112 px calorie ring
  flanked by Fiber and Sugar bars, with Protein / Carbs / Fat bars beneath. Day
  navigation, four meals (Breakfast / Lunch / Dinner / Snacks) with per-entry calories
  and macros, edit servings, move meal, delete, "save this day as a meal",
  "copy yesterday", and a FAB → search.
- **`health/nutrition/search.tsx`** — searchbar over the local library plus Open Food
  Facts. **Four tabs: All / Recent / My Meals / Custom.** The All tab is essential — it
  loads every food in the library so nothing becomes unreachable once it scrolls out of
  Recent. Portion dialog logs by servings or by amount (g/ml). Favourite toggling, and
  links out to the scanner, AI photo and custom-food screens.
- **`health/nutrition/scan.tsx`** — `expo-camera` barcode scanner → Open Food Facts
  lookup → portion dialog → log. Unknown barcodes hand off to the custom-food screen
  with the barcode pre-filled.
- **`health/nutrition/add-custom.tsx`** — create a food: per-serving and per-100 g
  macros, plus a collapsible "add vitamins & minerals" section.
- **`health/nutrition/ai-photo.tsx`** — photograph a meal, Gemini estimates the foods
  and macros, user confirms before logging. Reads `EXPO_PUBLIC_GEMINI_API_KEY` from
  `.env`; the whole feature degrades gracefully when the key is absent.
- **`health/micronutrients.tsx`** — Vitamins % and Minerals % rings, a grid of the 8
  tappable wellness categories, then full per-nutrient lists (14 vitamins, 10 minerals)
  with amount / RDA / % and a status bar. Ends with a "not medical advice" note.
- **`health/wellness/[cat].tsx`** — every nutrient feeding that category with amount,
  target, % and a status-coloured bar. The Energy category also shows calories.
- **`health/weight.tsx`** — log today's weight; week / month / all-time change; a
  **smoothed trend** chart (exponentially weighted, so daily water swings don't
  dominate); recent entries. Honours the kg/lb unit.
- **`health/sleep.tsx`** — bed time / wake time → duration, quality rating, history.
- **`health/water.tsx`** — glasses against target, quick add/remove.
- **`health/steps.tsx`** — Health Connect steps with a connect prompt when the provider
  isn't set up, day/week/month ranges, and an average.
- **`health/recovery.tsx`** — log any of nine modalities with optional duration: Sauna,
  Ice Bath, Cold Shower, Mobility, Foam Roll, Massage, Meditation, Walk, Nap.
- **`health/measurements.tsx`** — body measurements plus progress photos saved to
  `documentDirectory/progress-photos/`.
- **`health/coach.tsx`** — estimates true expenditure by comparing the weight trend
  against logged intake, and suggests target adjustments.
- **`health/meal-planner/index.tsx`** + **`shopping-list.tsx`** — plan the week, roll it
  into a shopping list.

### Fitness

- **`(tabs)/fitness.tsx`** — a "Workout in progress" resume banner, a "Today's split"
  card when the weekday has a routine, then eight cards: Start Workout, Programs,
  My Routines, Exercise Library, Progress, Weekly Split, Cardio, Records.
- **`fitness/active-workout.tsx`** — the centrepiece. Live header stats
  (Time · Exercises · Sets · Volume). A custom **SetKeypad** with seven set types —
  normal, warmup, failure, drop, assisted, partial, static — each a coloured dot;
  warm-up sets excluded from volume. A **RestTimer** with per-exercise suggestions. A
  **plate calculator**. **Progression suggestions** combining the exercise's rep range,
  last performance and weight increment. **Circuits** dropped in with one tap. A "my
  gym's equipment only" filter when adding exercises. Reorder exercises, edit or delete
  logged sets, backdate the session, discard.
- **`fitness/workout-summary.tsx`** — PR detection, total volume, set counts.
- **`fitness/workout-detail.tsx`** — reopen and repeat any past session.
- **`fitness/exercise-library.tsx`** — browse/filter 190 exercises by muscle group,
  equipment and mechanic; doubles as a picker when passed `selectFor`.
- **`fitness/exercise-detail.tsx`** — muscles, form tips, last top weight, estimated
  1RM, session count, an editable weight jump, last session's sets, top-weight chart.
- **`fitness/template-builder.tsx`** and **`fitness/template/[id].tsx`** — create and
  edit routines; per-exercise target sets, reps, rep range and weight.
- **`fitness/programs.tsx`** — the four levelled programs, cloneable.
- **`fitness/progress.tsx`** — weekly volume vs landmarks; sets by type over 30 days;
  progressive-overload suggestions with "apply to routine" writing the new weight back
  into the template; per-exercise max-weight chart; recent workouts.
- **`fitness/weekly-split.tsx`** — assign a routine or rest to each weekday; today is
  highlighted and tappable to start.
- **`fitness/cardio.tsx`** — tile grid of the 20 cardio exercises, plus recent sessions
  with duration and distance.
- **`fitness/records.tsx`** — strength standards (est-1RM ÷ bodyweight on the
  Untrained→Elite scale, with the ratio needed for the next level) and personal bests.

### Learn — `(tabs)/life.tsx` + `learn/*`

Hub with four cards: Nutrition, Myology, Biomechanics, Basic Anatomy. All four render
through one shared `ArticleScreen` component taking
`{ title, intro, sections: { heading, body?, bullets?: {term, text}[] }[] }`.

### Life modules

Tasks (due dates, priorities), Habits (daily ticks, streaks, a GitHub-style heatmap),
Budget (transactions by category against a monthly budget), and a unified Calendar
marking workouts, meals, tasks, habits and weigh-ins. **Give these real entry points** —
a "Life" section on Home, or a fifth tab. Do not build them and leave them unlinked.

### Profile and onboarding

- **`onboarding/index.tsx`** — runs once, skippable. Name, goal, sex, age, weight,
  height, activity level. A live preview card computes the plan as soon as
  age/weight/height are filled. "Start Tracking" saves the targets.
- **`profile/index.tsx`** — level card → achievements; dark-mode switch; Reminders;
  About You (name, age, height, weight unit); My Gym Equipment (multi-select, drives
  the equipment filter); Daily Targets (calories, protein, carbs, fat, fiber, sugar,
  sodium, water, monthly budget); Data & Backup; version footer.
- **`profile/achievements.tsx`** — the 17 achievements, locked and unlocked.
- **`profile/reminders.tsx`** — four local notifications via `expo-notifications`:
  workout (17:30, only on days with a routine in the Weekly Split), daily habits
  (20:00), hydration (14:00), streak check (20:30).

## 8. Stores — `src/stores/` (Zustand, one per domain)

`userStore` (profile, targets, units, equipment, XP/level) · `nutritionStore` (day
logs, totals, recents, favourites, **all foods**, saved meals, custom foods, search,
copy-yesterday) · `workoutStore` (the largest — exercises, templates, programs, weekly
schedule, live sessions, sets, PRs, progression, volume, cardio, history) ·
`weightStore` (entries + smoothed trend) · `sleepStore` · `waterStore` ·
`recoveryStore` · `measurementStore` · `mealPlanStore` · `taskStore` · `habitStore` ·
`budgetStore` · `gamificationStore` · `reminderStore`.

Screens reload through `useFocusEffect`, not `useEffect`, so returning to a screen
shows fresh data.

## 9. Shared components

`ScreenHeader` (title, optional back arrow via `showBack`, right slot) is used by
nearly every screen — build it first. Then `MotionCard` (staggered `FadeInUp`
entrance, `noEnter` to disable), `EmptyState`, `ProgressRing` (SVG, centre
value/label), `AppCard` (big tappable module card), `SectionHeader`,
`CategoryIconPicker`, `MiniCharts`, `HabitHeatmap`, `HabitTile`, `ArticleScreen`,
`MuscleMap` (body map shaded by weekly volume), `SetKeypad`, `RestTimer`,
`PlateCalculator`, `WorkoutDateDialog`.

## 10. Services

- **`openFoodFacts.ts`** — `searchOpenFoodFacts(query)`, `lookupBarcode(code)`. Handle
  offline and missing-product cases without crashing.
- **`aiRecognition.ts`** — `isAiConfigured()`, `recognizeFoodFromPhoto()`,
  `recognizedToFood()`. Gemini; the app works fully without the key.
- **`healthConnect.ts`** with a **`healthConnect.web.ts`** stub — availability,
  permission request, connect, `getDailySteps`, open settings.
- **`backup.ts`** — `buildBackupJson`, `exportBackup`, `pickBackupFile`,
  `importBackup`. Export every table to JSON; import wholesale-replaces inside a single
  transaction, restoring only columns that exist in the current schema.
- **`calendarData.ts`** — `getMarkedDates`, `getDaySummary`.

## 11. Build order

Work in phases. Do not start a phase until the previous checkpoint passes.

1. **Skeleton** — scaffold, all config files, theme, `ThemeContext`, `ScreenHeader`,
   `MotionCard`, tab layout with four placeholder screens.
   *Checkpoint:* `npx tsc --noEmit` clean; app loads on web with the dark palette.
2. **Database** — `schema.ts` with all 28 tables, `runMigrations`, `DatabaseProvider`,
   seeds for exercises, foods, programs, achievements.
   *Checkpoint:* app boots, tables exist, 190 exercises and 50 foods queryable.
3. **Profile + onboarding** — `userStore`, targets, Mifflin–St Jeor, dark-mode toggle.
   *Checkpoint:* complete onboarding, see computed targets persist across a reload.
4. **Nutrition** — store, day view, search with all four tabs, custom food, portions,
   saved meals, copy-yesterday.
   *Checkpoint:* log a food to a meal and see it in the day totals after a reload.
5. **Fitness core** — exercise library, detail, templates, active workout with the
   keypad and all seven set types, summary, PRs.
   *Checkpoint:* run a full workout start→finish; volume and PRs correct; warm-up sets
   excluded from volume.
6. **Fitness analytics** — volume landmarks, progress charts, progression suggestions
   with "apply to routine", records and strength standards, weekly split, cardio.
   *Checkpoint:* set a rep range and increment, log a top-of-range set, confirm the app
   suggests the next weight and can write it back to the routine.
7. **Health extras** — weight with smoothed trend, sleep, water, steps, recovery,
   measurements, coach, meal planner.
8. **Micronutrients** — the 24 nutrients, category grid, category detail screens.
9. **Life modules** — tasks, habits with heatmap, budget, calendar — each with a real
   entry point.
10. **Learn** — `ArticleScreen` and the four articles.
11. **Home dashboard** — assemble it last, once every data source exists; then the
    Customize Dashboard screen.
12. **Polish and ship** — notifications, backup/restore, achievements, empty states,
    then the EAS build.

## 12. Verification

- `npx tsc --noEmit` must be **0 errors** at every checkpoint.
- `npx expo-doctor` should pass fully.
- Test in the browser: `npx expo start --web`, then open **`http://127.0.0.1:8081`** —
  `localhost` can hang on IPv6. Expo Go does **not** support SDK 56, so the web build
  and EAS dev/preview builds are your only test surfaces.
- Android APK: `npx eas-cli login` then
  `npx eas-cli build -p android --profile preview`.

## 13. Gotchas that will cost you hours

- **Only one browser tab** may have the app open at a time — a second tab locks the
  in-memory SQLite with "Storage couldn't start … Invalid VFS state".
- Content inside a `MotionCard`/`Animated.View` with a `FadeInUp` entrance is invisible
  to `innerText` scraping until the animation finishes — read the accessibility tree
  instead when testing programmatically.
- `npm install` needs `--legacy-peer-deps` every time.
- Required native peers that are easy to miss: `expo-font`, `react-native-worklets`.
- Keep the seven set types and the semantic status colours distinct from the brand red;
  collapsing everything to one colour destroys readability. (This app has already been
  through one over-aggressive recolour — don't repeat it.)
- Write the Home dashboard last. It reads from almost every store, and building it
  early means rewriting it repeatedly.

## 14. Improvements over the previous build

The prior version accumulated these problems. Avoid them by design:

1. **No orphaned screens.** Eleven fully-built screens ended up with no entry point
   after a navigation refactor. Every route must be reachable from the UI; add an
   assertion or a checklist and keep it current.
2. **Food search must have an "All" tab** from day one.
3. **Macro targets should support a range** (min–max), not just a single number — store
   `*_target_min` / `*_target_max` columns alongside the target and render bars with a
   shaded target band.
4. Name theme constants for what they are (`BRAND`, not a leftover `GREEN` holding a
   red value).
5. Don't ship unused components — delete them or wire them up.

--- END PROMPT ---
