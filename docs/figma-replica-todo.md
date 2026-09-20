# Figma Replica Backlog

Goal: make the running app a visual and interaction-level replica of Figma file
`i3up2XkzCrBsB7eizwHt2T`, page `Screens`, section `Incus — User Flow`.

Status tags:

- `[ ]` not yet verified against a rendered Figma screenshot
- `[~]` partially aligned; needs a pixel-level comparison pass
- `[x]` verified only after side-by-side comparison at the 390 px mobile viewport

## Global Foundations

- [ ] Compare every theme color, font size, weight, line height, radius, border, icon size, and spacing token against `★ Design System` (`198:2425`).
- [ ] Match system/status bar and 390 px artboard safe-area offsets across every screen.
- [ ] Match the four-tab bar: 74 px height, icon/label sizes, active-state container, divider, labels `Home`, `Health`, `Fitness`, `Life`.
- [ ] Replace route-level generic Paper defaults wherever their padding, elevation, input, button, chip, dialog, or switch geometry differs from Figma.
- [ ] Add screenshot comparison for all frames at 390 px width, documenting deviations and accepting none larger than a defined visual tolerance.
- [ ] Ensure every Figma prototype target is reachable from the same corresponding in-app element.

## Cover And Onboarding

- [ ] Decide whether `★ Cover` (`198:2407`) is a required app screen or a design-file cover only; do not implement it unless it is part of the prototype flow.
- [~] Onboarding (`198:2606`): compare exact vertical offsets, 326 px field width, 44/48 px control heights, selected fills, and footer visibility.
- [ ] Add/verify the Figma action that exits onboarding; confirm it persists onboarding completion and opens Home.

## Home And Dashboard Customization

- [~] Home (`198:2489`): compare all section y-positions, card heights, 118 px calorie ring, macro/micro tracks, section headings, and bottom-tab overlap.
- [ ] Match the exact Figma nutrition values/layout when prototype data is used, while retaining real data for normal runtime.
- [ ] Match seven Weekly Workouts rows: title/label overlap behavior, 10 px tracks, MEV ticks, status wording, and color mapping.
- [ ] Build the Figma Health Analytics treatment exactly: Sleep and Fluid rings/cards, Vitamins and Minerals rings, card dimensions, labels, and navigation.
- [ ] Match the Learn card copy box, height, typography, and location.
- [ ] Customize Dashboard (`198:2648`): inspect and rebuild ordered section rows, drag handles, up/down buttons, visibility controls, chip geometry, metric selector, steppers, and Save button.
- [ ] Restore Figma’s `Habits` and `Steps` customization rows or obtain a revised Figma frame if those modules are intentionally absent.

## Nutrition And Health

- [~] Health/Nutrition root (`198:2742`): compare day-strip cell widths/heights, hero card dimensions, ring placement, macro tracks, actions, meal cards, and FAB.
- [~] Nutrition extended screen (`198:2839`): inspect its full content and reconcile any differences from the Health-root implementation.
- [~] Food Search (`198:2932`): compare header text, 46 px search box, four-tab widths, two action buttons, result heading, 62 px row dimensions, and trailing add controls.
- [~] Custom Food (`198:2989`): compare every field label offset, macro grid, micronutrient accordion, solid/liquid segmented control, and save button.
- [~] Barcode Scan (`198:3034`): compare camera viewport, scan-corner geometry, flash control, instruction copy, and result sheet position/content.
- [~] Water Intake (`198:2853`): compare ring color/stroke, 250 px hero, 2×2 quick controls, Custom row, log rows, and timestamps.
- [ ] Sleep Log (`198:2893`): rebuild the 180 px summary card, 7-night chart geometry/labels, and fixed `Log Tonight's Sleep` action against Figma.
- [ ] Confirm whether all non-framed health screens (AI photo, micronutrients, wellness, weight) are excluded from the prototype or need newly supplied Figma frames before claiming 1:1 coverage.

## Fitness

- [~] Fitness hub (`198:3073`): compare title spacing, four primary 72 px rows, icon colors/backgrounds, and all lower navigation handling against the frame.
- [ ] Active Workout (`198:3117`): inspect and rebuild header metrics, exercise/set rows, keypad, set-type controls, timer, calculator, and finish action.
- [ ] Workout Summary (`198:3188`): inspect and rebuild PR summary, stats, share surface, and navigation.
- [ ] Programs (`198:3250`): inspect and rebuild level tabs/cards, program metadata, and clone controls.
- [ ] Exercise Library (`198:3294`): inspect and rebuild search/filter controls, row density, group sections, and picker behavior.
- [ ] Exercise Detail (`198:3386`): inspect and rebuild hero/stat blocks, muscle/form sections, history chart, and editing controls.
- [ ] Progress (`198:3429`): inspect and rebuild volume/overload charts, trend cards, and workout list.
- [ ] Workout History (`198:3495`): inspect and rebuild date grouping, session rows, and repeat controls.
- [ ] Records (`198:3722`): inspect and rebuild strength-standard bars, PR rows, and next-level messages.
- [ ] Routine Editor (`198:3788`): inspect and rebuild template metadata, editable exercise rows, target controls, and add-exercise flow.
- [ ] Reconcile Figma’s repeated `16 Fitness — Hub` variants (`198:4096`, `198:4162`, `198:4209`, `198:4271`, `198:4323`, `198:4395`, `198:4441`, `198:4478`) with current app states; implement every distinct state.
- [ ] Determine whether Figma includes distinct frames for Cardio and Weekly Split; if not, keep them functional but do not claim visual parity.

## Life And Profile

- [~] Life hub (`198:3566`): compare exact header/subtitle layout, 72 px module rows, icon tiles, copy, chevrons, and tab bar.
- [ ] Confirm whether Figma expects article screens; obtain frames for Nutrition, Myology, Biomechanics, and Basic Anatomy before declaring them 1:1.
- [ ] Profile (`198:3648`): remove or hide non-Figma level, achievements, reminders, backup, and expanded-equipment surfaces from the primary frame flow.
- [ ] Profile: rebuild exact header, 48 px form/control rows, target field labels, macro min/max fields if Figma adds them, Save button, and footer.
- [ ] Preserve achievements, reminders, backup, and equipment behavior behind Figma-defined navigation or add Figma frames for them.

## Cross-Cutting Prototype Completion

- [ ] Update `docs/figma-map.md` after each frame is screenshot-verified; replace `Inspected and aligned` with a real verification status.
- [ ] Capture a 390 px screenshot of every implemented route from Expo web and compare it side-by-side with the corresponding Figma screenshot.
- [ ] Verify every interactive Figma target navigates to the correct route and every action mutates/persists the expected local data.
- [ ] Run `npx.cmd tsc --noEmit`, `npx.cmd expo-doctor`, and a clean Expo web bundle.
- [ ] Perform the backup-import compatibility test before Android shipping.
- [ ] Build an EAS preview APK using the existing project and signing credentials, then walk the replica flow on Android.

## Blockers To Exact 1:1 Claims

- [ ] Obtain Figma frames for every app route without a named frame: AI photo, micronutrients, wellness details, weight, cardio, weekly split, achievements, reminders, backup/restore, article pages, macro range states, portion dialogs, and error/empty states.
- [ ] Resolve Figma-only modules (`Habits`, `Steps`, and any other Life destinations) by either implementing them or receiving revised Figma frames that remove them.
- [ ] Define the target data state for visual snapshot comparisons; live local data otherwise changes card values, row counts, and chart geometry.