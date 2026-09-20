# Figma frame-by-frame spec

Read from `i3up2XkzCrBsB7eizwHt2T`, page `0:1` "Screens", on 20 Sep 2026.
All device frames are **390 × N**. Working notes for the rebuild.

## Frame inventory

| Node | Name in file | Size | Actually contains |
|---|---|---|---|
| 198:2425 | ★ Design System | 960×1060 | Tokens + components |
| 198:2489 | 01 Home — Dashboard | 390×1620 | Home (inside section "Incus — User Flow" 198:2488) |
| 198:2606 | 00 Onboarding | 390×881 | Onboarding |
| 198:2648 | 02 Customize Dashboard | 390×1180 | Customize dashboard |
| 198:2742 | 03 Health — Hub | 390×1010 | **Nutrition screen** (misnamed) |
| 198:2839 | 04 Nutrition | 390×2643 | **EMPTY STUB** — back arrow + tab bar only |
| 198:2853 | 09 Water Intake | 390×820 | Water — **stale, not recoloured** |
| 198:2893 | 10 Sleep Log | 390×820 | Sleep — **stale, not recoloured** |
| 198:2932 | 05 Food Search | 390×900 | Food search |
| 198:2989 | 06 Custom Food | 390×1020 | Create Food |
| 198:3034 | 07 Barcode Scan | 390×844 | Barcode scan |
| 198:3073 | 16 Fitness — Hub | 390×844 | Fitness hub |
| 198:3117 | 19 Active Workout | 390×760 | Active workout |
| 198:3188 | 20 Workout Summary | 390×876 | Workout summary |
| 198:3250 | 22 Programs | 390×860 | Programs (different content to app) |
| 198:3294 | 17 Exercise Library | 390×1040 | Exercise library |
| 198:3386 | 18 Exercise Detail | 390×1120 | Exercise detail |
| 198:3429 | 23 Progress | 390×1080 | Progress |
| 198:3495 | 21 Workout History | 390×900 | Workout history |
| 198:3566 | 24 Life — Hub | 390×844 | **Learn hub** (misnamed) |
| 198:3648 | 29 Profile | 390×1500 | Profile — has the macro ranges |
| 198:3722 | 35 Records | 390×700 | Records |
| 198:3788 | 38 Routine Editor | 390×820 | Routine editor + set dialog |
| 198:4096 | 16 Fitness — Hub | 390×844 | Wellness: **untitled** (Brainpower?) |
| 198:4162 | 16 Fitness — Hub | 390×844 | Wellness: Muscles |
| 198:4209 | 16 Fitness — Hub | 390×844 | Wellness: Skin, Hair & Nails |
| 198:4271 | Sleep and Recovery | 390×844 | Wellness category |
| 198:4323 | 16 Fitness — Hub | 390×844 | Wellness: Energy |
| 198:4395 | 16 Fitness — Hub | 390×844 | Wellness: Bone Health |
| 198:4441 | 16 Fitness — Hub | 390×844 | Wellness: Immune System |
| 198:4478 | 16 Fitness — Hub | 390×844 | Wellness: Hormones & Libido |

Eight wellness-category frames total (7 misnamed "16 Fitness — Hub" + Sleep and Recovery).

---

## ★ Design System (198:2425)

**Colour** — Background `#121212` · Surface `#1C1C1E` · Surface 2 `#2A2A2C` ·
Outline `#323234` · Accent `#A83232` · Text `#FFFFFF`. Matches `src/theme/index.ts`.

**Typography samples** — Display "Good Morning" · Headline "Weekly Workouts" ·
Title "Bench Press" · Body "Track calories, macros & meals" · Label "12 TARGET".

**Components** — Primary Button (filled accent, rounded ~10) · Secondary (outlined,
surface) · Chips (active = accent fill, inactive = Surface 2) · Card/Surface
"Rounded 16 · #1C1C1E on #121212" · Progress ring (accent arc on dark track, % in
centre) · Tab bar (4 circles + labels, active = accent).

---

## Home — Dashboard (198:2489)

Section "Incus — User Flow" holds only this one frame; it is not a flow diagram.
Groups 1 and 2 (Sleep, Fluid rings) float as siblings of the frame, not children.

- **Header** — "WEDNESDAY 17 JUNE" kicker x31 y52 · "Good Morning" x31 y72 (30 tall) ·
  40px avatar circle x332 y60 with "C".
- **Nutrition card** x16 y200 358×196 — 124px ring (x31.5 y218) with "1180" / "eaten";
  right column "520" / "1700" / "kcal left"; macro rows on 162×6 tracks: Protein
  82/150g (fill 74), Carbs 140/250g (fill 103), Fat 38/65g (fill 94.7); bottom strip
  of three micro columns y353/y374: Fiber 14/30g (99 track, 46 fill), Sugar 31/50g
  (100, 62), Sodium 1100/2300 (96, 45.9).
- **Weekly Workouts** title x31 y411 · card x16 y441 358×276 · rows 328×10 tracks with
  a 2×14 MEV tick:

  | Muscle | Label | Colour | Fill |
  |---|---|---|---|
  | Chest | 16 sets · in the sweet spot | green | 239 |
  | Back | 12 sets · productive — room to add | amber | 157 |
  | Shoulders | 6 sets · below minimum — add sets | red | 75 |
  | Legs | 18 sets · in the sweet spot | green | 295 |
  | Glutes | 10 sets · productive — room to add | amber | 207 |
  | Arms | 20 sets · in the sweet spot | green | 272 |
  | Core | 24 sets · over max — consider a deload | red | 328 (full) |

  Status text right-aligned and coloured to match the bar. **Semantic colours used.**
- **Health Analytics** title x32 y731 · 2×2 grid of 171×164 cards, each a 109px ring
  with value centred and label beneath:
  - **6 Hrs / Sleep** · **1.5 L / Fluid**
  - **78% / Vitamins** · **62% / Minerals**
  - All four rings accent red. **No weight card.**
- **Learn** title x31 y1119 · card x16 y1149 358×164 · the aerobic-system fact.
- ~230px empty gap, then tab bar y1546 390×74, 1px top divider. Home active.
  Hotspots over Health / Fitness / Life.
- Junk: duplicate "Minerals" text node; two empty "Text" placeholders at y858;
  frame 1620 tall inside a 1614 section.

---

## Nutrition (198:2742, misnamed "03 Health — Hub")

Tab-level screen. **4th tab reads "Learn" here** — the only frame that does.

- Title "Nutrition", centred, no back arrow.
- **Week strip** — 7 rounded pills: `S 11 · M 12 · T 13 · W 14 · T 15 · F 16 · S 17`,
  day letter above date number.
- **Hero card** — calorie ring centred with "1180" / "eaten"; **Fiber 14/30g** bar to
  its left and **Sugar 31/50g** bar to its right; then full-width bars underneath:
  Protein 82/150g, Carbs 140/250g, Fat 38/65g.
- **Two buttons** side by side: "Copy Yesterday" · "Save as Meal".
- **Meal cards** — red dot + name + total cal on the left, `+` button on the right;
  entries beneath as `<name>` then `<cal> cal · <n>P <n>C <n>F <n>S · <n> serving`:
  - Breakfast 420 cal — Greek yogurt + berries (180 cal · 40P 10C 3F 10S · 1 serving);
    Oats (240 cal · 0P 35C 5F 0S · 1 serving)
  - Lunch 620 cal — Chicken & rice bowl (620 cal · 15P 30C 5F 0S · 1 serving)
  - Dinner 0 cal — "Nothing logged"
  - Snack 140 cal — Protein bar (140 cal · 20P 10C 3F 10S · 1 serving)
- Tab bar: Home / **Health (active)** / Fitness / Learn.

---

## Food Search (198:2932)

- Back chevron · title "**Add to Lunch**" (contextual to the meal).
- Search field with leading icon, placeholder "Search foods…".
- **Chips: All (active) · Recent · My Meals · Custom** — confirms the four-tab design.
- Two buttons: "⬚ Scan Barcode" · "+ Create Food".
- "RESULTS" label, then rows: name, `<cal> cal · <n>P <n>C <n>F <n>S · <serving>`,
  and a `+` button right. Sample rows: Chicken breast 165/100g, White rice cooked
  130/100g, Greek yogurt 59/100g, Banana 89/1 medium, Almonds 579/100g, Olive oil
  884/100g, Broccoli 34/100g.
- No tab bar.

---

## Create Food (198:2989)

- Back chevron · title "Create Food".
- Field "Food name" (Homemade granola).
- Row: "Serving size" (50) · "Unit" (g).
- Section label "NUTRITION (per serving)".
- "Calories" full width (220).
- Row: Protein (g) 6 · Carbs (g) 28 · Fat (g) 9.
- Row: Fiber (g) 4 · Sugar (g) 8 · Sodium (mg) 45.
- Collapsible "+ Add vitamins & minerals" with a caret.
- "LIQUID?" label, segmented: **Solid (g)** (active, accent) · Liquid (ml).
- "Save Food" wide button (surface, not accent).
- No tab bar.

---

## Barcode Scan (198:3034)

- Status bar drawn (9:41). Back chevron · title "Scan Barcode" · ⚡ torch toggle right.
- Camera area dark with a **reticle**: four accent-red corner brackets and a horizontal
  accent scan line across the middle.
- Caption under the reticle: "Align the barcode within the frame".
- **Result sheet** rising from the bottom, rounded top, with a grab handle:
  - "Quaker Oats" · "Rolled Oats · 1kg"
  - Four stat tiles: **379 Cal · 13g Protein · 67g Carbs · 8g Fat**
  - "Serving" label, a dropdown "40g (1 serving)", and an accent "Add to Lunch" button.

---

## Fitness Hub (198:3073)

- "Fitness" headline · "Build routines and track your progress" subtitle.
- "MODULES" label, then **only four cards**, each with a coloured circle icon, title,
  subtitle and a `›` chevron:
  - **Start Workout** — "Begin a new workout session" — dark red icon
  - **Programs** — "Leveled routines: beginner → advanced" — dark red icon
  - **My Routines** — "Create and manage workout templates" — **beige/tan icon**
  - **Exercise Library** — "Browse 190 exercises by muscle group" — **purple icon**
- Large empty area below. Tab bar with Fitness active, 4th tab "Life".
- **Conflict:** the app's hub has eight cards (adds Progress, Weekly Split, Cardio,
  Records). Those screens exist as their own frames but are not linked from this hub.
- **Note:** icons are not all accent red — two carry legacy colours.

---

## Active Workout (198:3117)

- Status bar (9:41). Back chevron · "**Push Day**" title with "00:42:15" beneath ·
  accent "**Finish**" pill top-right.
- **Rest timer bar** — full-width surface row, icon + "Rest timer", "1:30" in accent.
- **Exercise card** per exercise, with ˄/˅ collapse arrows top-right:
  - "Barbell Bench Press" · "Mid chest · 6–10 reps"
  - Two chips: "Compound" · "Rest 2:30 suggested"
  - Set table, columns **SET · PREV · KG · REPS · ✓**
    - 1 · 60×10 · 60 · 10 · accent checkbox ticked
    - 2 · 60×10 · 60 · 10 · ticked
    - 3 · — · 62.5 · 8 · empty checkbox
  - Two buttons: accent "**Suggested 62.5×7**" · surface "**Apply to routine**"
  - Second card "Lateral Raise" · "Side delts · 12–15 reps" · chips "Isolation" ·
    "Rest 1:30 suggested" · rows 1 (12×10, 12, 15, ✓) and 2 (12×12, 12, 13, ✓)
- Three stacked buttons: "+ Add Exercise" (outlined) · "⟳ Add a circuit" (outlined,
  accent text) · "✓ Finish Workout" (filled accent).
- No tab bar.

---

## Water Intake (198:2853) — STALE

**Not recoloured.** Uses steel blue/grey (~`#8FA8B5`) rather than the accent.

- Back chevron · "Water Intake".
- Large ring card: "6" over "of 8 glasses", "1500ml / 2000ml" beneath.
- Quick-add grid: "+1 Glass" · "+250ml" · "+500ml" · "+1L", then an outlined "Custom".
- "Today's Log" list: 250ml 08:12 · 500ml 11:30 · 250ml 14:05 · 500ml 17:40.

---

## Sleep Log (198:2893) — STALE

**Not recoloured.** Uses lavender (~`#A8A4C0`).

- Back chevron · "Sleep Log".
- Summary card: moon icon in a circle, "**7h 30m**", "23:00 → 07:00",
  "Quality: Good".
- "Last 7 nights" bar chart, 7 bars with day + hours beneath:
  Mon 7.5h · Tue 6.8h · Wed 8.1h · Thu 7.2h · Fri 6h · Sat 8.5h · Sun 7.5h.
- Disabled-looking "Log Tonight's Sleep" button.

---

## Wellness category — Sleep and Recovery (198:4271)

Representative of all eight category frames.

- Centred title "Sleep & Recovery" y83, no back arrow.
- One card x16 y129 358×586 holding seven nutrient rows; each row is
  name (left) · `0 / target unit` (middle, right-aligned) · `%` (x324) · a 322×9 track
  below with proportional fill.

  | Nutrient | Value | % | Fill |
  |---|---|---|---|
  | Calcium | 0 / 1000 mg | 88% | 283 |
  | B6 (Pyridoxine) | 0 / 1.3 mg | 77% | 249 |
  | Magnesium | 0 / 400 mg | 64% | 206 |
  | Potassium | 0 / 3400 mg | 42% | 135 |
  | Sodium | 0 / 1500 mg | 77% | 249 |
  | Vitamin D | 0 / 20 mcg | 77% | 249 |
  | Tryptophan | 0 / 0.3 g | 77% | 249 |

- **All bars are the same accent red** — no semantic colouring, unlike Home.
- Disclaimer x31 y631 322×55, centred, two paragraphs: the "all values are
  estimated…" sentence then "This is not medical advice".
- Tab bar y770; **Fitness is highlighted** on a nutrition screen (wrong); 4th tab "Life".
- Tryptophan is an amino acid — not in the app's 14 vitamins + 10 minerals.

---

## Workout Summary (198:3188)

- Big accent circle with a white tick, centred.
- "**Workout Complete!**" · "Push Day · 47 min" · "Fri 28 Aug, 16:56".
- 2×2 stat tiles: **5 Exercises · 18 Sets · 240 Reps · 4,250 Volume (kg)**.
- "Muscles worked" card with **front and back body silhouettes**, worked muscles
  filled accent red, labels "Front" / "Back" beneath, then "Chest 6 · Shoulders 4 · Arms 6".
- Two buttons: "Copy Summary" · "Change date & time".
- Wide accent "Done" button.

---

## Exercise Library (198:3294)

- Back chevron · "Exercises" · accent "+" top right.
- Search field "Search exercises…".
- Filter chips, horizontally scrollable: **All (active) · Chest · Back · Shoulders ·
  Arms · Leg…**
- Second row of two buttons: "≡ Type" · "Library".
- Count line: "190 exercises".
- Rows: a rounded square icon with a coloured dot, then name, then
  "Chest • Front Delts, Triceps" on one line, equipment on the next, chevron right.
- **Icons are multi-coloured per muscle group** — blue (Chest), red (Back), orange
  (Legs), purple (Biceps), gold (Shoulders), teal (Abs). Not monochrome.

---

## Exercise Detail (198:3386)

- Back chevron · "Bench Press".
- Hero card in a **muscle-group tint** (dark teal/blue here) with the muscle name
  large in that colour ("CHEST") and "Primary target" beneath.
- Chips: **Compound** (accent) · Barbell · Push.
- "Muscles worked" card: rows "Primary / Chest" and "Secondary / Front Delts, Triceps".
- "Form video" card with a play button on a dark placeholder.
- "How to perform" — numbered steps in small accent circles:
  1. Lie flat, grip the bar slightly wider than shoulders.
  2. Lower the bar to mid-chest with elbows ~45°.
  3. Press up explosively until arms are extended.
  4. Keep shoulder blades retracted throughout.
- Wide accent "Add to Workout" button.

---

## Progress (198:3429)

- Back chevron · "Progress".
- Exercise dropdown ("Bench Press").
- **Estimated 1RM** card: "+8.5 kg in 3 months" in accent, a red line chart, and
  "82.5 kg" bottom-left.
- **Weekly volume · sets vs landmarks** card with the explainer "The bar spans your
  minimum-effective to maximum-recoverable weekly sets.", then the same seven muscle
  rows as Home (Chest…Core) with semantic colours — **except Core here is PURPLE**,
  not red, for "over max — consider a deload".
- **Personal Records** — 2×2 tiles, values in accent: 1RM 82.5 kg · Best set 75 kg × 6
  · Max volume 4,250 kg · Total reps 1,240.

---

## Workout History (198:3495)

- Back chevron · "History" · "This month · 14 workouts".
- Cards per session: name left, date right; a three-column stat row
  (47 min / Duration, 4,250 kg / Volume, 18 sets / Sets); a gold "★ 2 PRs" chip when
  PRs were set; an outlined accent "Repeat" button bottom-right.
- Sample: Push Day Jun 17 (2 PRs), Pull Day Jun 15 (1 PR), Leg Day Jun 13 (3 PRs),
  Push Day Jun 10 (no chip), Pull Day Jun 8 (1 PR).

---

## Programs (198:3250)

- Back chevron · "Programs" · "Choose a program to follow".
- Cards with a **coloured left edge stripe**, a level chip, "N days/week · N weeks",
  a one-line description, and an outlined "Start →" button tinted to match the stripe.

| Program | Level | Schedule | Description | Stripe |
|---|---|---|---|---|
| StrongStart 5×5 | Beginner | 3 days/week · 8 weeks | Full-body barbell foundations | red |
| PPL Hypertrophy | Intermediate | 6 days/week · 12 weeks | Push / Pull / Legs split | tan |
| PHUL Power | Advanced | 4 days/week · 10 weeks | Power + hypertrophy upper/lower | orange |
| Dumbbell Only | Beginner | 4 days/week · 6 weeks | Home-friendly, minimal kit | red |

**Completely different from the app's four** (Foundations, Minimalist, Upper/Lower
Builder, Push/Pull/Legs).

---

## Learn hub (198:3566, misnamed "24 Life — Hub")

- "Learn" headline · subtitle "Learn about the body with topics like Myology,
  Biomechanics, Basic Anatomy and Nutrition."
- "MODULES" label, four cards with coloured circle icons and chevrons:
  - **Nutrition** — "Understand Macros and Micros" — beige icon
  - **Myology** — "Study Muscles in the body" — red icon
  - **Biomechanics** — "Study the Biomechanics of your body" — pale green icon
  - **Basic Anatomy** — "Get a basic grasp of the human anatomy" — red icon
- Tab bar with the 4th tab active and labelled "Life".

---

## Profile (198:3648)

Simpler than the app's profile.

- "APPEARANCE" — a "Dark Mode" row with a moon icon and an accent toggle (on).
- "ABOUT YOU" — Name (Cain); then a row Age (24) / Weight (kg) (76) / Height (cm) (180).
  Outlined fields with floating labels.
- "Weight Unit" — segmented **kg** (accent) / lbs.
- "MY GYM EQUIPMENT" — sub-label "Free Weights" with chips Barbell, Dumbbell, EZ Bar
  (accent = selected) and Kettlebell (grey = unselected); sub-label "Machines" with
  Cable, Leg Press, Lat Pulldown (accent) and Smith (grey).
- **"DAILY TARGET RANGES"** — the macro-range feature:
  - "Calorie target" — `1500-1800`
  - Row: "Protein (g)" `56-133-145-177`, "Carbs (g)" `170-210-360`, "Fat (g)" `55`
  - Ranges are hyphenated text. The protein value is garbled placeholder data; the
    intent is a min–max string, with a bare number meaning a single target.
- Wide accent "Save Changes" button. Footer "Incus v1.0.0".
- **Absent vs the app:** no XP/level card, no achievements link, no reminders link,
  no Data & Backup section.

---

## Records (198:3722)

- Back chevron · "Records".
- "Strength standards" with a **Male / Female** segmented control (Male active).
- Per-lift cards: name, a level chip top-right (accent tint), a **five-segment bar**
  labelled Untr / Novi / Inte / Adva / Elit beneath (filled segments in accent), then
  "Est. 1RM 80 kg · 0.98× bodyweight".
  - Barbell Bench Press — Novice — 80 kg — 0.98×
  - Back Squat — Intermediate — 120 kg — 1.46×
  - Deadlift — Novice — 140 kg — 1.71×
- "Personal bests" list: accent dot, name, "Top 60 kg × 10 · 1RM 80 · best 10 reps".

---

## Routine Editor (198:3788)

- Back chevron · "Push Day".
- Numbered exercise rows (accent numerals), each with name and
  "4 sets × 6–10 reps · 62.5 kg · +2.5", and up/down carets right. The first row is
  outlined in accent (selected).
  1. Barbell Bench Press — 4 sets × 6–10 reps · 62.5 kg · +2.5
  2. Incline Dumbbell Press — 3 sets × 8–12 reps · 28 kg · +2
  3. Overhead Press — 3 sets × 5–8 reps · 45 kg · +2.5
  4. Lateral Raise — 3 sets × 12–15 reps · 10 kg · +2
- **Modal sheet** "Barbell Bench Press" with stepper rows (− value +):
  Sets 4 · Min reps 6 · Max reps 10 · Working weight (kg) 62.5 · Weight jump (kg) 2.5.
- Helper text: "The weight jump is added when auto-progressing once you hit the top of
  the rep range."
- "Cancel" and accent "Save" buttons.

---

## Customize Dashboard (198:2648)

- Back chevron · "Customize Dashboard".
- "SECTIONS" · "Drag to reorder · tap the eye to hide". Eight rows, each with a drag
  handle, name, up/down arrows and an eye toggle:
  **Weekly Workouts · Today · Insights & Analytics · Habits · Body Metrics ·
  Muscle Groups · Exercises · Steps**
- "MUSCLE GROUPS" chips: Chest, Back, Legs, Shoulders, Arms, Core (accent = on),
  Glutes (grey = off).
- "EXERCISE METRIC" segmented: **1RM** (accent) / Volume / Weight.
- "WEEKLY TARGETS" stepper rows: Muscles 12 · Sets 60 · Exercises 20.
- Wide accent "Save Dashboard" button.
- **Note:** the section list names Habits, Body Metrics and Steps — modules that are
  out of scope.

---

## The eight wellness categories

Same layout throughout: centred title, one card of nutrient rows
(name · `0 / target unit` · `%` · proportional bar), the estimate disclaimer, tab bar.
**Every bar is accent red regardless of percentage.** The tab bar wrongly shows
Fitness active on all eight, and the 4th tab reads "Life".

| Node | Title | Nutrients listed |
|---|---|---|
| 198:4096 | **(no title)** | Choline, Omega-3, Iron, Magnesium, B6, B12, Zinc, Vitamin D, B9 (Folate), Calories |
| 198:4162 | Muscles | Protein, Calories, B12, Sodium, Zinc, Vitamin D |
| 198:4209 | Skin, Hair & Nails | Protein, Omega-3, Copper, Iron, Selenium, Zinc, Vitamin A, Vitamin C, Vitamin E |
| 198:4271 | Sleep & Recovery | Calcium, B6, Magnesium, Potassium, Sodium, Vitamin D, Tryptophan |
| 198:4323 | Energy | Calories, B1, B2, B3, B9, B12, Copper, Iron, Magnesium, Potassium, Sodium |
| 198:4395 | Bone Health | Magnesium, Manganese, Phosphorus, Potassium, Vitamin D, Vitamin K |
| 198:4441 | Immune System | B12, Vitamin A, Vitamin C, Vitamin D |
| 198:4478 | Hormones & Libido | Iron, Magnesium, Selenium, Zinc, B12, Vitamin A, Vitamin D |

Percentages reuse a small set of placeholder values (42 / 64 / 77 / 88 / 95 / 120).
Row spacing is uneven in several frames (gaps in Muscles, Immune System, Hormones &
Libido) — visual noise rather than intent.

**Category naming vs the app:** design says "Muscles" (app: "Muscle & Performance")
and "Immune System" (app: "Immune Function"); one frame has no title at all.

**Nutrients in the design the app does not track:** Choline, Omega-3, Tryptophan,
Manganese, Phosphorus — plus Protein and Calories rendered as nutrient rows.

---

## Conflicts to resolve before building

1. **Fitness hub lists only 4 modules** (Start Workout, Programs, My Routines,
   Exercise Library). Progress, Weekly Split, Cardio and Records exist as frames but
   have no entry point. Building "exactly" strands four working features.
2. **Home shows "Fluid" (water)** — a module ruled out of scope. And there is no
   weight card anywhere on Home.
3. **Programs content differs entirely** — four different programs with different
   names, levels, durations and descriptions.
4. **Profile loses XP, achievements, reminders and backup** if built exactly.
5. **Water and Sleep frames are stale** — blue/lavender, never recoloured.
6. **Tab 4 is "Life" in every frame except Nutrition**, which says "Learn".
7. **Wellness bars are flat red; Home and Progress bars are semantic** green/amber/red
   — and Progress uses purple for over-max where Home uses red.
8. **Wellness categories reference untracked nutrients** and rename two categories.
9. **Customize Dashboard lists Habits, Body Metrics and Steps** — out-of-scope modules.
10. **Wellness tab bars highlight Fitness** on nutrition screens.
