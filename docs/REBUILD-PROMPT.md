# Incus — Figma-First Rebuild Prompt

**How to use**

1. Authorize the **Figma MCP connector** first — the agent cannot do this mid-run, and
   the build depends on it.
2. Open an empty folder in VS Code and start your agent in it.
3. Paste everything between `--- BEGIN PROMPT ---` and `--- END PROMPT ---`.

The rebuild is an **in-place upgrade** of the app already on the phone: same package
id, same signing key, same database. The existing data must survive.

---

--- BEGIN PROMPT ---

# Build "Incus" — a private, offline-first Android life-tracking app, to its Figma design

You are rebuilding an existing app from scratch against a finished Figma design. Read
this entire brief before writing any code, then work the phases in order.

## 0. Mission

Incus is a single-user, **offline-first** Android app for nutrition, training and body
metrics. No accounts, no cloud, no telemetry — everything lives in a local SQLite
database on the device. It is data-dense and dark by default, built around one brand
red on charcoal.

Design values, in priority order:

1. **Data integrity.** The user's history is irreplaceable and unbacked-up. Schema
   changes are additive only; nothing is dropped, renamed in place, or silently
   migrated away.
2. **The Figma design is the specification.** Not an inspiration, not a colour
   reference. Layout, hierarchy and spacing come from the frames.
3. **Speed of logging.** Logging a set or a meal takes seconds — custom keypads over
   stock inputs, sensible defaults, one-tap repeats.
4. **Density with calm.** Many numbers, one accent colour, restrained motion.
5. **Honesty.** Estimates are labelled as estimates; anything health-adjacent carries a
   "not medical advice" note.

## 1. Non-negotiable constraints — read twice

This app is already installed on a phone with months of real data in it. The rebuild
must install **over** it as an update.

- `android.package` is **`com.lifetracker.app`**. Do not change it. Do not "clean it
  up" to match the app name.
- The EAS **signing keystore must be the reused existing one**. A new keystore means
  Android refuses the update, the user uninstalls to proceed, and every row is gone.
- The database file is **`life-tracker.db`** (and `:memory:` on web). Do not rename it.
- Every table and column name in §6 must match **exactly**. A rebuilt app that queries
  `workout_sets.workout_id` instead of `workout_log_id` compiles fine, runs fine, and
  silently shows the user an empty history.
- Schema changes are additive: `CREATE TABLE IF NOT EXISTS` for tables, and new
  columns as `ALTER TABLE ... ADD COLUMN` appended to `runMigrations()`, wrapped so
  **only** a "duplicate column" error is swallowed — everything else must throw.
- **Never `DROP` a table**, including the tables belonging to the modules this rebuild
  does not ship (§4). Their rows stay on disk, untouched.

If you believe one of these constraints is wrong, stop and ask. Do not resolve it
yourself.

## 2. The design is in Figma — go and read it

**File:** `https://www.figma.com/design/i3up2XkzCrBsB7eizwHt2T/`
**Section:** "Incus — User Flow"

Before building any screen:

1. Load the `figma-design-to-code` skill. It is a required prerequisite for
   `get_design_context` and it is not optional.
2. Call `get_metadata` on the file to **enumerate the frames yourself.** Do not trust
   any frame-name list, including one in this brief — node ids shift whenever the file
   is edited, so find frames by name and title text, not by cached id.
3. For each screen: `get_screenshot` to see it, then `get_design_context` for the real
   structure, spacing and colour values.

**The rule: read the frame before you build the screen.** Section §8 below describes
what each screen does and, where a layout is already settled, exactly how it is laid
out — but where this brief and the Figma design disagree, **the Figma design wins**,
and you should say so in your notes rather than quietly picking one.

If the Figma connector is unavailable, **stop and report it.** Do not invent layouts
and do not fall back on generic Material screens — that failure mode is what made this
rebuild necessary.

## 3. Design system

Have this in place before Figma loads, and verify it against the frames.

```ts
const BRAND = '#A83232';       // the single brand accent
const BRAND_DIM = '#8A2828';   // light-mode primary
```

Name the constants `BRAND` / `BRAND_DIM`. (The previous codebase called them
`GREEN` / `GREEN_DIM` long after the values turned red — don't inherit that.)

**Dark palette (default):**
```
primary #A83232   primaryContainer #3A1210   onPrimary #FFFFFF   onPrimaryContainer #F3D0D0
secondary #9AA0A6 secondaryContainer #2A2A2C onSecondary #FFFFFF onSecondaryContainer #E3E3E6
tertiary #A83232  tertiaryContainer #3A1210  onTertiary #FFFFFF  onTertiaryContainer #F3D0D0
background #121212   surface #1C1C1E   surfaceVariant #2A2A2C   surfaceDisabled #1C1C1E
onBackground #F2F2F4 onSurface #F2F2F4 onSurfaceVariant #9A9AA0
outline #323234   outlineVariant #262628   error #FF6B6B   errorContainer #3A1A1A
elevation: level0 transparent, level1 #1C1C1E, level2 #222224,
           level3 #262628, level4 #2A2A2C, level5 #2E2E30
```

**Light palette:**
```
primary #8A2828   primaryContainer #F5D6D6   onPrimary #FFFFFF   onPrimaryContainer #3A0A0A
secondary #5F6368 secondaryContainer #ECEDEF onSecondaryContainer #1A1C1E
tertiary #8A2828  tertiaryContainer #F5D6D6  onTertiaryContainer #3A0A0A
background #FAFAFA   surface #FFFFFF   surfaceVariant #F0F1F2
onBackground #17181A onSurface #17181A onSurfaceVariant #5F6368
outline #DADCE0   outlineVariant #E8EAED   error #D7373F   errorContainer #FFDAD6
elevation: level1 #FFFFFF, level2 #F7F8F9, level3 #F2F3F4, level4 #EEEFF1, level5 #EAEBED
```

**Semantic status colours — keep these independent of the brand:**
```
#66BB6A  on target / good
#FFA726  partial / warning
#FF6B6B  low / bad
```

Every progress bar, ring and status label uses these. **Do not recolour them to the
brand red.** This codebase has already been through one over-aggressive recolour that
flattened every signal to a single hue and destroyed readability; the brand red marks
brand surfaces, the status trio carries meaning.

**Typography** — `configureFonts` over the system font, MD3 scale tightened for
density (`size/weight/letterSpacing`):
```
displayLarge 54/700/-0.5    displayMedium 44/700/-0.25   displaySmall 34/700/0
headlineLarge 30/700/-0.25  headlineMedium 26/700/0      headlineSmall 22/700/0
titleLarge 20/700/0         titleMedium 16/600/0.1       titleSmall 14/600/0.1
bodyLarge 16/400/0.15       bodyMedium 14/400/0.2        bodySmall 12/400/0.3
labelLarge 14/600/0.1       labelMedium 12/600/0.4       labelSmall 11/600/0.4
```

**Also export from `src/theme/index.ts`:**
```ts
export const accent = BRAND;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const shape = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const motion = {
  snappy: { damping: 24, stiffness: 320, mass: 0.8 },
  smooth: { damping: 22, stiffness: 200, mass: 1 },
  bouncy: { damping: 18, stiffness: 220, mass: 0.9 },
};
export function withAlpha(hex: string, alpha: number): string; // 6-digit hex + 0–1 → 8-digit
```

`src/theme/ThemeContext.tsx` exposes `useAppTheme()` → `{ colors, dark, toggle }`,
backed by react-native-paper's `PaperProvider`, persisting to `user_profile.theme_pref`.
**Every screen reads colours from `useAppTheme()`** — never hard-code a neutral.

## 4. Scope

### Build these

| Area | Routes |
|---|---|
| Tabs | Home, Health (→ Nutrition), Fitness, Learn |
| Nutrition | day view, food search, barcode scan, add custom food, AI photo |
| Micronutrients | micronutrients overview, wellness category detail |
| Body | weight, sleep |
| Fitness | active workout, workout summary, workout detail, exercise library, exercise detail, template builder, template detail, programs, progress, weekly split, cardio, records |
| Learn | hub + four articles (Nutrition, Myology, Biomechanics, Basic Anatomy) |
| Other | onboarding, profile, achievements, reminders, customize dashboard |

### Do NOT build these

**Tasks, Habits, Budget, Calendar, Water, Steps, Recovery, Measurements, Coach,
Meal Planner.** They have no place in the four-tab design. Do not add them back as a
helpful extra, do not leave stub routes for them, and do not create their stores.

Consequently, **omit** from the rebuild:

- dependencies `react-native-calendars` (calendar only) and
  `react-native-health-connect` (steps only)
- `plugins/withHealthConnectPermissionDelegate.js` and the
  `react-native-health-connect` entry in `app.json` plugins
- the `android.permission.health.READ_STEPS` permission
- `expo-image-picker` — only the dropped Measurements screen used it. Add it back only
  if the Figma AI-photo frame offers "choose from gallery".
- `services/healthConnect.ts`, `healthConnect.web.ts`, `services/calendarData.ts`

But **keep** their database tables (§6). Deleting the module is a UI decision; deleting
the data is not yours to make.

## 5. Stack and configuration

Expo SDK 56 changed a great deal. **Read https://docs.expo.dev/versions/v56.0.0/
before writing code** — do not rely on pre-SDK-56 memory.

**`package.json`**
```json
{
  "name": "life-tracker",
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
    "expo-linking": "~56.0.14",
    "expo-notifications": "~56.0.25",
    "expo-router": "~56.2.10",
    "expo-sharing": "~56.0.17",
    "expo-sqlite": "~56.0.5",
    "expo-status-bar": "~56.0.4",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.85.3",
    "react-native-chart-kit": "^6.12.3",
    "react-native-gesture-handler": "~2.31.1",
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

Install with `npm install --legacy-peer-deps` (React 19 peer conflicts) — every time.
`expo-font` and `react-native-worklets` are required native peers that are easy to miss.

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

**`metro.config.js`** — required, or `expo-sqlite` will not work in the web build you
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
    "slug": "life-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "life-tracker",
    "userInterfaceStyle": "automatic",
    "android": {
      "package": "com.lifetracker.app",
      "allowBackup": true,
      "adaptiveIcon": {
        "backgroundColor": "#121212",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "permissions": ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"]
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
      ["expo-build-properties", { "android": { "minSdkVersion": 26 } }]
    ],
    "extra": { "router": {}, "eas": { "projectId": "<keep the existing EAS project id>" } }
  }
}
```

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
so each APK installs as an in-place update.

**Project structure** — Expo Router uses **`src/app/`**, not a root `app/`. Entry point
is `"main": "expo-router/entry"`; there is no `App.tsx` or `index.ts`. **Typed routes
stay disabled** — they break dynamic routes here, so all routes are plain strings. Use
the classic `Tabs` from `expo-router`, not NativeTabs.

```
src/
├── app/            # routes
├── components/     # common/ dashboard/ learn/ workout/
├── data/           # exercises.json, foods.json, programs.json,
│                   #   volumeLandmarks.ts, strengthStandards.ts, circuits.ts
├── database/       # schema.ts, DatabaseProvider.tsx
├── services/       # openFoodFacts.ts, aiRecognition.ts, backup.ts
├── stores/         # Zustand, one per domain
├── theme/          # index.ts, ThemeContext.tsx
├── types/          # index.ts
└── utils/          # calories, micronutrients, progression, workout, muscles,
                    #   dashboard, dates
```

## 6. Database — exact schema

`src/database/schema.ts` exports one `getDatabase()` that opens the database once, runs
`runMigrations()`, then seeds. On web open `':memory:'`; on native open
`'life-tracker.db'`.

### Tables the app uses — reproduce this DDL exactly

```sql
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT,
  age INTEGER,
  weight REAL,
  height REAL,
  activity_level TEXT,
  calorie_target INTEGER DEFAULT 2000,
  protein_target INTEGER DEFAULT 150,
  carbs_target INTEGER DEFAULT 250,
  fat_target INTEGER DEFAULT 65,
  fiber_target INTEGER DEFAULT 30,
  sugar_target INTEGER DEFAULT 50,
  sodium_target INTEGER DEFAULT 2300,
  water_target INTEGER DEFAULT 8,
  monthly_budget REAL,
  weight_unit TEXT DEFAULT 'kg',
  theme_pref TEXT DEFAULT 'dark',
  onboarded INTEGER DEFAULT 0,
  goal TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT,
  calories REAL DEFAULT 0,
  protein REAL DEFAULT 0,
  carbs REAL DEFAULT 0,
  fat REAL DEFAULT 0,
  fiber REAL DEFAULT 0,
  sugar REAL DEFAULT 0,
  sodium REAL DEFAULT 0,
  serving_size REAL DEFAULT 100,
  serving_unit TEXT DEFAULT 'g',
  micros TEXT,
  is_custom INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS food_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
  meal_type TEXT CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
  servings REAL DEFAULT 1,
  log_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saved_meal_id INTEGER REFERENCES saved_meals(id) ON DELETE CASCADE,
  food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
  servings REAL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bedtime TEXT NOT NULL,
  wake_time TEXT NOT NULL,
  duration_minutes INTEGER,
  quality INTEGER DEFAULT 3,
  notes TEXT,
  log_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weight REAL NOT NULL,
  log_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_group TEXT,
  target TEXT,
  primary_muscles TEXT,
  secondary_muscles TEXT,
  mechanic TEXT,
  region TEXT,
  log_type TEXT DEFAULT 'weight_reps',
  equipment TEXT,
  description TEXT,
  tips TEXT,
  weight_increment REAL,
  is_custom INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT,
  days_per_week INTEGER,
  program_name TEXT,
  day_label TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  target_sets INTEGER DEFAULT 3,
  target_reps INTEGER DEFAULT 10,
  target_rep_min INTEGER,
  target_rep_max INTEGER,
  target_weight REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES workout_templates(id),
  name TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_log_id INTEGER REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER,
  reps INTEGER DEFAULT 0,
  weight REAL DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  distance REAL DEFAULT 0,
  rpe REAL,
  set_type TEXT DEFAULT 'normal',
  is_completed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weekly_schedule (
  day_of_week INTEGER PRIMARY KEY,
  template_id INTEGER
);

CREATE TABLE IF NOT EXISTS reminders (
  type TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  hour INTEGER DEFAULT 18,
  minute INTEGER DEFAULT 0,
  days_of_week TEXT,
  notif_ids TEXT
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  unlocked_at TEXT
);

CREATE TABLE IF NOT EXISTS xp_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER,
  source TEXT,
  description TEXT,
  earned_at TEXT DEFAULT (datetime('now'))
);
```

Notes that matter:

- `food_logs` stores **only** `food_id` + `servings`; macros are joined from `foods` at
  read time. There is no denormalised copy and no amount/unit column — portion entry by
  grams is computed against `serving_size` / `serving_unit` and stored as `servings`.
- Meal keys are `breakfast | lunch | dinner | snack` (singular "snack") and the CHECK
  constraint enforces it.
- `weekly_schedule` is keyed by `day_of_week`; `reminders` is keyed by `type`.
- `exercises` has no `created_at`.

### Tables to create but not use

The dropped modules' tables must still exist so their rows survive and a future version
can read them. Create them (copy the shapes from the old codebase if available,
otherwise `CREATE TABLE IF NOT EXISTS` with the same names) and then leave them alone:

```
meal_plans   shopping_list   water_logs   recovery_logs   tasks   habits
habit_logs   transactions    budget_categories   body_measurements
progress_photos   events
```

### Migrations — append in this exact order

`runMigrations()` holds an array of ALTER statements applied in order, each wrapped so
that a "duplicate column" error is ignored and anything else throws:

```
ALTER TABLE user_profile ADD COLUMN theme_pref TEXT DEFAULT 'dark'
ALTER TABLE user_profile ADD COLUMN onboarded INTEGER DEFAULT 0
ALTER TABLE user_profile ADD COLUMN goal TEXT
ALTER TABLE workout_sets ADD COLUMN set_type TEXT DEFAULT 'normal'
ALTER TABLE template_exercises ADD COLUMN target_rep_min INTEGER
ALTER TABLE template_exercises ADD COLUMN target_rep_max INTEGER
ALTER TABLE workout_templates ADD COLUMN level TEXT
ALTER TABLE workout_templates ADD COLUMN days_per_week INTEGER
ALTER TABLE workout_templates ADD COLUMN program_name TEXT
ALTER TABLE workout_templates ADD COLUMN day_label TEXT
ALTER TABLE user_profile ADD COLUMN fiber_target INTEGER DEFAULT 30
ALTER TABLE user_profile ADD COLUMN sugar_target INTEGER DEFAULT 50
ALTER TABLE user_profile ADD COLUMN sodium_target INTEGER DEFAULT 2300
ALTER TABLE exercises ADD COLUMN tips TEXT
ALTER TABLE user_profile ADD COLUMN equipment TEXT
ALTER TABLE exercises ADD COLUMN target TEXT
ALTER TABLE exercises ADD COLUMN log_type TEXT DEFAULT 'weight_reps'
ALTER TABLE workout_sets ADD COLUMN duration_seconds INTEGER DEFAULT 0
ALTER TABLE workout_sets ADD COLUMN distance REAL DEFAULT 0
ALTER TABLE foods ADD COLUMN micros TEXT
ALTER TABLE exercises ADD COLUMN primary_muscles TEXT
ALTER TABLE exercises ADD COLUMN secondary_muscles TEXT
ALTER TABLE exercises ADD COLUMN mechanic TEXT
ALTER TABLE exercises ADD COLUMN region TEXT
ALTER TABLE user_profile ADD COLUMN dashboard_config TEXT
ALTER TABLE exercises ADD COLUMN weight_increment REAL
ALTER TABLE user_profile ADD COLUMN sex TEXT
```

These are already applied on the user's device. Reproducing them keeps a fresh install
identical to an upgraded one. Note `sex`, `equipment` and `dashboard_config` arrive
**only** through migrations — they are not in the base `user_profile` DDL, and it must
stay that way.

Then append the **new** migrations for macro ranges (§7.5):

```
ALTER TABLE user_profile ADD COLUMN protein_target_min INTEGER
ALTER TABLE user_profile ADD COLUMN protein_target_max INTEGER
ALTER TABLE user_profile ADD COLUMN carbs_target_min INTEGER
ALTER TABLE user_profile ADD COLUMN carbs_target_max INTEGER
ALTER TABLE user_profile ADD COLUMN fat_target_min INTEGER
ALTER TABLE user_profile ADD COLUMN fat_target_max INTEGER
ALTER TABLE user_profile ADD COLUMN fiber_target_min INTEGER
ALTER TABLE user_profile ADD COLUMN fiber_target_max INTEGER
ALTER TABLE user_profile ADD COLUMN sugar_target_min INTEGER
ALTER TABLE user_profile ADD COLUMN sugar_target_max INTEGER
```

A null min/max means "single target" — the existing `*_target` column is used alone, so
every profile already on a device keeps working untouched.

### Seeding

- **190 exercises** across Arms (35), Back (31), Core (28), Legs (26), Chest (20),
  Cardio (20), Shoulders (19), Glutes (11). Each carries target muscle, primary and
  secondary muscles, mechanic (compound/isolation), region, equipment, description and
  form tips. Re-seed when the bundled set has fields the DB lacks (check for a NULL
  `primary_muscles`), **updating existing rows by name** rather than inserting
  duplicates — user workouts reference those exercise ids.
- **50 starter foods** with full macros.
- **4 programs** (§7).
- **17 achievements** with XP rewards.
- Starter workout templates.

Every seeder must be idempotent: it runs on every launch, against a database that may
already be full.

## 7. Domain data and formulas

**`utils/calories.ts` — Mifflin–St Jeor.** BMR from sex/weight/height/age →
TDEE = BMR × activity multiplier (1.2 sedentary … 1.9 very active) → goal adjustment
−500 (lose) / 0 (maintain) / +400 (gain), floored at 1,200 kcal. Protein 2.0 g/kg
bodyweight (2.2 for muscle gain), fat 25% of calories, carbs the remainder.

**`data/volumeLandmarks.ts` — weekly hard sets per muscle group.** MEV = minimum to
grow, MAV = productive middle, MRV = recoverable maximum. Original rounded rules of
thumb, not copied from any proprietary source.

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

**`data/strengthStandards.ts` — est-1RM ÷ bodyweight** thresholds for entry to
Novice / Intermediate / Advanced / Elite (below the first = Untrained).

| Lift | Male | Female |
|---|---|---|
| Barbell Bench Press | 0.75 / 1.0 / 1.5 / 2.0 | 0.4 / 0.6 / 0.9 / 1.2 |
| Back Squat | 1.0 / 1.5 / 2.0 / 2.5 | 0.6 / 1.0 / 1.4 / 1.8 |
| Deadlift | 1.25 / 1.75 / 2.25 / 2.75 | 0.75 / 1.2 / 1.6 / 2.0 |
| Overhead Press | 0.5 / 0.7 / 0.9 / 1.2 | 0.3 / 0.45 / 0.6 / 0.8 |
| Barbell Row | 0.6 / 0.85 / 1.15 / 1.5 | 0.4 / 0.6 / 0.85 / 1.1 |

Keyed by the exact seeded exercise name.

**`utils/progression.ts` — smallest sensible weight jump by equipment:** dumbbell 2 kg;
machine / cable / smith / leverage 5 kg; barbell / EZ / trap 2.5 kg; kettlebell 4 kg;
bodyweight / band 1 kg; fallback 2.5 kg. A per-exercise override
(`exercises.weight_increment`) always wins.

**`utils/micronutrients.ts`** — 14 vitamins and 10 minerals, each with an NIH RDA and
unit, plus 8 wellness categories: Brainpower 🧠, Muscle & Performance 💪, Skin Hair &
Nails ✨, Sleep & Recovery 😴, Energy ⚡, Bone Health 🦴, Immune Function 🛡️,
Hormones & Libido ❤️. Helpers `percentOf`, `groupPercent`, `categoryPercent`.

**`data/circuits.ts`** — body-part circuit presets dropped into a session in one tap,
linking the moves so the user rotates with no rest. Match names case-insensitively
against the library and skip any that aren't found. At minimum: Forearm Circuit
(Reverse Curl, Wrist Curl, Hammer Curl), Biceps Burnout (Barbell Curl, Hammer Curl,
Concentration Curl), Triceps Finisher (Tricep Pushdown, Tricep Kickback), Core Circuit
(Plank, Hollow Body Hold, Dead Bug, Mountain Climber).

**`data/programs.json`** — Foundations (beginner, 3-day full body), Minimalist
(beginner, 2-day), Upper / Lower Builder (intermediate, 4-day), Push / Pull / Legs
(advanced, 6-day). Cloneable into the user's own routines.

**Gamification** — 10 levels: Beginner → Apprentice → Dedicated → Committed → Advanced
→ Elite → Master → Champion → Legend → Mythic.

## 8. Screens

Read the Figma frame for each one before you build it. Where a layout is given below it
is already settled and verified — build it as described and confirm against the frame.

### Tabs — `src/app/(tabs)/_layout.tsx`

| Tab | Route file | Icon | Content |
|---|---|---|---|
| Home | `(tabs)/index.tsx` | `home` | Dashboard |
| Health | `(tabs)/health.tsx` | `heart-pulse` | Renders the Nutrition screen as a tab root. **There is no Health hub** — the icon goes straight to Nutrition. |
| Fitness | `(tabs)/fitness.tsx` | `dumbbell` | Fitness hub |
| Learn | `(tabs)/life.tsx` | `school` | Learn hub |

Profile lives at `/profile`, reached from the Home header avatar.

### Home — `(tabs)/index.tsx`

Settled layout, top to bottom:

- **Header** — uppercase long date, time-aware greeting (Good Morning / Afternoon /
  Evening), round brand-red avatar button → `/profile`.
- **Nutrition card** (tap → Nutrition) — 118 px SVG calorie ring, "*n* / *target* kcal
  left", macro bars (protein, carbs, fat), micro columns (fiber, sugar, sodium).
- **Weekly Workouts** (tap → Progress, with a "See All" link) — one bar per muscle
  group, sets in the last 7 days against the landmarks, the status label, and a tick
  marking MEV on the track.
- **Health Analytics** — a 2×2 grid: Weight, Sleep, Vitamins % ring, Minerals % ring.
  **The Weight and Sleep cells are §9.4 — read the frame.**
- **Learn** — a daily rotating fact card.
- Sections are reorderable and hideable from Customize Dashboard, linked from the Home
  header. Do not leave that screen stranded.

### Health / Nutrition

- **`health/nutrition/index.tsx`** — doubles as the Health tab root via an `asTab` prop
  that hides the back arrow. **Hero card** (tap → micronutrients): a 112 px calorie ring
  flanked by a Fiber bar on the left and a Sugar bar on the right, with Protein / Carbs
  / Fat bars beneath. Then day navigation, the four meals (Breakfast / Lunch / Dinner /
  Snacks) with per-entry calories and macros, edit servings, move meal, delete, "save
  this day as a meal", "copy yesterday", and a FAB → search.
- **`health/nutrition/search.tsx`** — see §9.3.
- **`health/nutrition/scan.tsx`** — see §9.2.
- **`health/nutrition/add-custom.tsx`** — create a food: per-serving and per-100 g
  macros, plus a collapsible "add vitamins & minerals" section.
- **`health/nutrition/ai-photo.tsx`** — photograph a meal with `expo-camera`, Gemini
  estimates foods and macros, user confirms before logging. Reads
  `EXPO_PUBLIC_GEMINI_API_KEY` from `.env`; the whole feature degrades gracefully when
  the key is absent (`isAiConfigured()`).
- **`health/micronutrients.tsx`** — Vitamins % and Minerals % rings, a grid of the 8
  tappable wellness categories, then per-nutrient lists (14 vitamins, 10 minerals) with
  amount / RDA / % and a status bar. Ends with a "not medical advice" note.
- **`health/wellness/[cat].tsx`** — every nutrient feeding that category with amount,
  target, % and a status-coloured bar (green ≥100%, amber ≥60%, red below). The Energy
  category also shows calories against target.
- **`health/weight.tsx`** — log today's weight; week / month / all-time change; a
  **smoothed trend** chart (exponentially weighted, so daily water swings don't
  dominate); recent entries. Honours the kg/lb unit from Profile.
- **`health/sleep.tsx`** — bed time / wake time → duration, quality rating, history.

### Fitness

- **`(tabs)/fitness.tsx`** — see §9.1.
- **`fitness/active-workout.tsx`** — the centrepiece. Live header stats
  (Time · Exercises · Sets · Volume). A custom **SetKeypad** with seven set types —
  `normal`, `warmup`, `failure`, `drop`, `assisted`, `partial`, `static` — each a
  coloured dot; **warm-up sets are excluded from volume**. A **RestTimer** with
  per-exercise suggestions (`expo-audio` + `expo-haptics`). A **plate calculator**.
  **Progression suggestions** combining the exercise's rep range, last performance and
  weight increment. **Circuits** dropped in with one tap. A "my gym's equipment only"
  filter when adding exercises. Reorder exercises, edit or delete logged sets, backdate
  the session, discard.
- **`fitness/workout-summary.tsx`** — PR detection, total volume, set counts; shareable
  via `react-native-view-shot`.
- **`fitness/workout-detail.tsx`** — reopen and repeat any past session.
- **`fitness/exercise-library.tsx`** — browse and filter 190 exercises by muscle group,
  equipment and mechanic; doubles as a picker when passed `selectFor`.
- **`fitness/exercise-detail.tsx`** — muscles, form tips, last top weight, estimated
  1RM, session count, an editable weight jump, last session's sets, top-weight chart.
- **`fitness/template-builder.tsx`** + **`fitness/template/[id].tsx`** — create and edit
  routines; per-exercise target sets, reps, rep range (`target_rep_min` /
  `target_rep_max`) and weight.
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
through one shared `ArticleScreen` taking
`{ title, intro, sections: { heading, body?, bullets?: { term, text }[] }[] }`.

### Onboarding and profile

- **`onboarding/index.tsx`** — runs once, skippable. Name, goal, **sex**, age, weight,
  height, activity level. A live preview card computes the plan as soon as
  age/weight/height are filled. "Start Tracking" saves the targets. (Sex is required by
  the strength standards, so don't drop it.)
- **`profile/index.tsx`** — level card → achievements; dark-mode switch; Reminders;
  About You (name, age, height, weight unit); My Gym Equipment (multi-select, drives the
  equipment filter); Daily Targets including the **macro ranges** of §9.5;
  Data & Backup; version footer.
- **`profile/achievements.tsx`** — the 17 achievements, locked and unlocked.
- **`profile/reminders.tsx`** — four local notifications via `expo-notifications`:

  | Reminder | Default | Fires |
  |---|---|---|
  | Workout reminder | 17:30 | Only on days with a routine in the Weekly Split |
  | Daily habits | 20:00 | Nudge to tick habits |
  | Hydration | 14:00 | Drink water |
  | Streak check | 20:30 | "Keep your streak alive" |

  The habit and hydration reminders are kept even though those modules aren't shipping —
  the `reminders` rows already exist on the device. If a reminder has no screen to open,
  point it at Home rather than deleting the row.

- **`dashboard-customize.tsx`** — reorder and hide Home sections, choose muscle-group
  cards, pick the exercise-card metric, set weekly targets (muscles, sets, exercises).
  Persists to `user_profile.dashboard_config`.

## 9. The five upgrade items — new work, not carried over

These are the parts of the Figma design the previous build never reached. Treat each as
a first-class requirement.

### 9.1 Fitness tab — rebuild to the design

The old app shipped a generic hub: a resume banner, a "today's split" card and eight
identical module cards (Start Workout, Programs, My Routines, Exercise Library,
Progress, Weekly Split, Cardio, Records). **That is not the design.** Read the Fitness
frame in Figma and build what it shows. Every destination above must still be
reachable, but the layout, hierarchy and emphasis come from the frame.

### 9.2 Barcode scanner — rebuild to the design

`expo-camera` scanner → `lookupBarcode()` against Open Food Facts → portion dialog →
log. Unknown barcodes hand off to the custom-food screen with the barcode pre-filled.
The camera framing, the scan target overlay, the result sheet and the error states all
come from the Figma frame — read it rather than shipping a bare `CameraView`.

### 9.3 Food search — four tabs, All first

The old app had three tabs (Recent / Favorites / Meals) and **no way to see the whole
library**, so a food became unreachable once it scrolled out of Recent. That was a real
bug, reported by the user.

Build **All / Recent / My Meals / Custom**:

- **All** — every row in `foods`, ordered by name. This is the fix; it is not optional.
- **Recent** — recently logged, most recent first.
- **My Meals** — saved meals from `saved_meals` / `saved_meal_items`, logged in one tap.
- **Custom** — `foods WHERE is_custom = 1`.

Plus the searchbar across the local library and Open Food Facts, favourite toggling, and
a portion dialog that logs by servings or by amount in g/ml (converted against
`serving_size` / `serving_unit` and stored as `servings`). Confirm the tab styling and
row layout against the Figma frame.

### 9.4 Home Weight & Sleep analytics — the design's treatment

The old app rendered these as two plain stat cards showing a single number. The design
does something different. Read the Home frame, build what it shows, and wire it to
`weightStore.getTrendSeries()` and `sleepStore`.

### 9.5 Macro ranges

Users can set a **min–max range** per macro instead of a single number.

- Storage: the `*_target_min` / `*_target_max` columns from §6. Null means "single
  target" and the existing `*_target` column is used alone — never migrate a user's
  single target into a range on their behalf.
- Profile: each macro row takes an optional min and max alongside the target.
- Display: every macro bar — Home nutrition card, Nutrition hero, anywhere a macro is
  drawn — shows a **shaded target band** between min and max rather than a single fill
  line, and the status colour reflects in-range / under / over rather than
  percent-of-target.
- Applies to protein, carbs, fat, fiber and sugar. Calories keep a single target.

## 10. Stores, components and services

**Stores** (`src/stores/`, Zustand, one per domain): `userStore` (profile, targets,
units, equipment, XP/level), `nutritionStore` (day logs, totals, recents, favourites,
**all foods**, saved meals, custom foods, search, copy-yesterday), `workoutStore` (the
largest — exercises, templates, programs, weekly schedule, live sessions, sets, PRs,
progression, volume, cardio, history), `weightStore` (entries + smoothed trend),
`sleepStore`, `gamificationStore`, `reminderStore`.

Screens reload through `useFocusEffect`, not `useEffect`, so returning to a screen shows
fresh data.

**Components** — build `ScreenHeader` (title, optional back arrow via `showBack`, right
slot) first; nearly every screen uses it. Then `MotionCard` (staggered `FadeInUp`
entrance, `noEnter` to disable), `EmptyState`, `ProgressRing` (SVG, centre value/label),
`AppCard`, `SectionHeader`, `MiniCharts`, `ArticleScreen`, `MuscleMap` (body map shaded
by weekly volume), `SetKeypad`, `RestTimer`, `PlateCalculator`, `WorkoutDateDialog`.
Don't ship a component nothing imports.

**Services** — `openFoodFacts.ts` (`searchOpenFoodFacts`, `lookupBarcode`; handle
offline and missing products without crashing), `aiRecognition.ts` (`isAiConfigured`,
`recognizeFoodFromPhoto`, `recognizedToFood`), `backup.ts` (`buildBackupJson`,
`exportBackup`, `pickBackupFile`, `importBackup` — export **every** table including the
unused ones, and import wholesale-replaces inside a single transaction, restoring only
columns that exist in the current schema).

## 11. Build order

Do not start a phase until the previous checkpoint passes.

0. **Figma inventory.** Connect the MCP, load `figma-design-to-code`, run
   `get_metadata`, and write a frame-to-route map into `docs/figma-map.md`. Flag any
   screen in §8 with no matching frame, and any frame with no matching screen, before
   writing code.
   *Checkpoint:* the map exists and the gaps are named.
1. **Skeleton.** Scaffold, all config files, theme, `ThemeContext`, `ScreenHeader`,
   `MotionCard`, tab layout with four placeholders.
   *Checkpoint:* `npx tsc --noEmit` clean; app loads on web in the dark palette.
2. **Database.** `schema.ts` with the exact DDL, the full migration list, the unused
   tables, `DatabaseProvider`, and idempotent seeds.
   *Checkpoint:* app boots; 190 exercises and 50 foods queryable; running it twice
   changes no row counts.
3. **Profile + onboarding.** `userStore`, targets, Mifflin–St Jeor, dark-mode toggle.
   *Checkpoint:* complete onboarding, reload, targets persist.
4. **Nutrition.** Store, day view, search with all four tabs (§9.3), custom food,
   portions, saved meals, copy-yesterday.
   *Checkpoint:* log a food to a meal, reload, it is still in the day totals — and a
   food logged weeks ago is findable from the All tab.
5. **Fitness core.** Exercise library, exercise detail, templates, active workout with
   the keypad and all seven set types, summary, PRs.
   *Checkpoint:* run a workout start→finish; volume and PRs correct; warm-up sets
   excluded from volume.
6. **Fitness analytics.** Volume landmarks, progress charts, progression suggestions
   with "apply to routine", records and strength standards, weekly split, cardio.
   *Checkpoint:* set a rep range and increment, log a top-of-range set, confirm the app
   suggests the next weight and writes it back to the routine.
7. **Micronutrients.** The 24 nutrients, the category grid, the category detail screens.
8. **Weight and sleep.** Including the smoothed trend.
9. **Learn.** `ArticleScreen` and the four articles.
10. **The upgrade items.** Fitness tab (§9.1), barcode scanner (§9.2), macro ranges
    (§9.5) — each against its frame.
11. **Home dashboard.** Assemble last, once every data source exists, including the
    Weight/Sleep analytics (§9.4). Then Customize Dashboard.
12. **Ship.** Notifications, backup/restore, achievements, empty states, then the EAS
    build.

## 12. Verification

- `npx tsc --noEmit` = **0 errors** at every checkpoint.
- `npx expo-doctor` passes.
- Browser testing: `npx expo start --web`, then **`http://127.0.0.1:8081`** —
  `localhost` can hang on IPv6. Expo Go does **not** support SDK 56, so the web build
  and EAS dev/preview builds are the only test surfaces.
- **Data-compatibility test — do this before any APK goes near the phone.** Export a
  JSON backup from the *current* app, import it into the rebuild, and confirm every
  screen reads it: meals appear on the right days with the right macros, workout history
  and PRs are intact, weight trend and sleep history are unchanged, templates keep their
  exercises in order, and the profile's targets and equipment survive. If anything comes
  back empty, a column name is wrong — fix the schema, not the reader.
- Android: `npx eas-cli build -p android --profile preview`, reusing the existing
  keystore.
- Before shipping, walk every route and confirm it is reachable from the UI. The
  previous build left eleven finished screens with no entry point.

## 13. Gotchas that will cost you hours

- **Only one browser tab** may have the app open — a second tab locks the in-memory
  SQLite with "Storage couldn't start … Invalid VFS state".
- Content inside a `MotionCard` / `Animated.View` with a `FadeInUp` entrance is
  invisible to `innerText` scraping until the animation finishes. Read the accessibility
  tree instead when testing programmatically.
- `npm install` needs `--legacy-peer-deps` every single time.
- Do not collapse the semantic status colours into the brand red (§3).
- Build the Home dashboard last — it reads from nearly every store.
- Figma node ids shift whenever the file is edited. Find frames by name and title text,
  never by a cached id.
- `figma.getNodeByIdAsync` returns null unless you `await figma.setCurrentPageAsync(page)`
  first.

--- END PROMPT ---
