# Calisthenics Form Tracker (CFT)

Web-first calisthenics trainer with **live pose tracking**, **auto hold timers**, and **rule-based form coaching** — no video upload, no model training on your data.

[![CI](https://github.com/krishngohel/calisthenics-form-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/krishngohel/calisthenics-form-tracker/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## Features

- **29 skills** across pulls, pushes, static holds, planche progressions, Bosu, and legs
- **Auto hold timer** — the clock starts from the first frame you enter a hold and stops on the frame you leave it; short qualify/grace windows absorb single-frame pose glitches without adding or losing measured time
- **Auto-detect mode** — camera guesses which skill you're doing (`/train`)
- **Learn mode** — a ghost target skeleton is fitted onto *your* body (position, scale, and facing direction) with correction arrows toward the ideal pose
- **Hold Only vs Perfect Form** — stricter criteria and extra metrics in perfect mode
- **Live coaching cues** — geometry rules fire research-backed tips; cues stay on screen until dismissed
- **Whole-hold scoring** — the saved form score and coaching plan reflect every frame of the hold, not just the frame where form broke
- **Session progress chart** — form score over time while holding
- **Pose pipeline** — Web Worker, MoveNet (default) or MediaPipe, low-confidence keypoints filtered before any geometry runs, hand landmarks only for skills that need them
- **Distance-aware tracking** — adapts when you step back for full-body framing; auto zoom / lens switching on devices that support it
- **Device performance tiers** — auto-adjusts detection FPS and smoothing (low / medium / high)
- **App shell** — on phones and in the iOS app: first-launch onboarding (camera permission, experience level, voice coach), a bottom tab bar (Home, Paths, Progress, Settings), on-device hold history with streaks and personal bests; desktop web keeps the top nav
- **Training HUD** — timer, hold state, and form-score ring drawn over the camera, sized to read from across the room; a full-screen focus mode; the skeleton changes colour with hold state
- **Voice coach** — opt-in spoken "hold", 5-second count-outs, hold time on drop, and form cues, so you never look at the screen mid-hold
- **iOS app** — Capacitor shell with haptics on hold start / drop / new best, keep-awake, native status bar, dark mode
- **Supabase dashboard** — sign in, save sessions, view history and coaching plans. Without Supabase credentials the app runs fully offline.

## Quick start

```bash
git clone https://github.com/krishngohel/calisthenics-form-tracker.git
cd calisthenics-form-tracker
npm install

# Optional — cloud sync. Skip this to run offline.
cp apps/web/.env.example apps/web/.env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# Run supabase/migrations/*.sql in order in your Supabase project

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If the dev server acts stale (404s, broken nav), clear the Next cache:

```bash
npm run dev:clean -w apps/web
```

## Skills

| Category | Skills |
|----------|--------|
| **Upper body** | Dead Hang, Scapular Pulls, Plank Hold, Pull-Ups, Chin-Ups, Dips, Push-Ups, Muscle-Up, Pseudo Planche Push-Ups |
| **Static holds** | L-Sit, Frog Stand, Crow Pose, Handstand, 90° HSPU, Handstand Push-Ups, One-Arm Handstand, Skin the Cat, Front Lever, Planche Lean, Tuck / Adv. Tuck / Straddle / Full Planche |
| **Bosu** | Bosu Ball Single-Leg Squats |
| **Legs** | Pistol, Shrimp, Dragon, Sissy Squats, Nordic Curls |

Use **Paths** to pick a move, or **Auto-detect** to let the app lock on after ~1s of stable pose.

## Project structure

```
calisthenics-form-tracker/
├── apps/web/              Next.js 14 + Tailwind UI (static-exportable)
│   ├── app/               Routes (onboarding, home, skills, progress, settings, train, dashboard, auth)
│   ├── components/        App shell (tabs, screens), camera, HUD, coaching
│   ├── hooks/             Pose detection, hold session, voice coach, auth
│   ├── lib/               Camera, overlay projection, native bridge, Supabase
│   ├── ios/               Capacitor iOS project (open in Xcode)
│   └── workers/           Pose inference Web Worker
├── packages/core/         Shared skill rules, hold FSM, pose geometry, scoring (unit tested)
├── supabase/              SQL migrations for sessions & coaching plans
└── .github/workflows/     CI: lint, typecheck, test, build
```

## How coaching works

Everything runs **locally in the browser**:

1. A pretrained pose model (MoveNet or MediaPipe) outputs body landmarks in a Web Worker
2. Keypoints below a confidence floor are dropped; a joint that vanishes for a frame or two is carried forward with decaying confidence; the rest are One-Euro smoothed
3. Landmarks are made **isotropic** (x scaled by the frame aspect) so angles are true — in raw normalized coordinates a real 135° elbow reads as ~150° on a 16:9 frame
4. Per-skill **geometry rules** in `packages/core` measure angles, lines, and positions in **body units** (torso lengths), so every threshold holds at any distance, frame size, or aspect ratio
5. Joint angles are taken from the side the camera can actually see (the occluded side is hallucinated by the model), median-filtered over the last few frames
6. A hold state machine times the hold; a per-hold accumulator averages every metric
7. Failed metrics produce **live cues**, Learn-mode **correction arrows**, and post-hold **progression drills**
8. No cloud inference, no fine-tuning on user video

### The rule models

Each skill has explicit hold criteria and continuously scored metrics (0–100, linear between a fail and a pass value). Notable rules:

- **Scapular pulls** are measured against the athlete's own passive hang: the deepest hang in the last second is the baseline, and the shoulders must lift ≥ 0.12 T from it
- **L-sit** requires a 60–120° hip angle, not just raised hips
- **Handstand** perfect mode requires shoulders stacked over the hands, a straight line, and no arch
- **Front lever** perfect mode requires straight arms as well as a straight body
- **Planche family** shares one evaluator: lean, horizontality, leg position, and elbow lock, with per-progression thresholds

Threshold constants are documented at the top of `packages/core/src/skills/registry.ts` with the anthropometric ratios they were chosen against.

Visit `/dev/pose-benchmark` to compare providers on your device. The winner is saved to `localStorage` as `cft-body-provider`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:clean -w apps/web` | Delete `.next` and restart dev |
| `npm run build` | Production build |
| `npm run lint` | ESLint (web app) |
| `npm run typecheck` | TypeScript, both workspaces |
| `npm test` | Vitest unit tests for `@cft/core` |
| `npm run check` | Lint + typecheck + test (what CI runs before build) |
| `npm run build:ios -w apps/web` | Static export + `cap sync ios` |
| `npm run ios -w apps/web` | Open the iOS project in Xcode |

## Deploy (Netlify)

1. Push to GitHub and import the repo in [Netlify](https://app.netlify.com)
2. Set **Base directory** to `apps/web` (uses `netlify.toml`)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — HTTPS is required for camera access

## iOS app (Capacitor)

The web app runs inside a native shell via [Capacitor](https://capacitorjs.com). Requires Xcode and CocoaPods.

```bash
npm run build:ios -w apps/web   # static export → apps/web/out, then cap sync
npm run ios -w apps/web         # opens apps/web/ios/App/App.xcworkspace in Xcode
```

In Xcode select your team under **Signing & Capabilities**, pick a device, and run. Camera access works through the standard web camera API inside the native web view; the permission text lives in `ios/App/App/Info.plist`. The app is portrait-only and uses the dark theme's colour for the launch background.

Native extras (all no-ops on the web): haptics on hold start, drop, and new best; status bar follows the theme; splash screen auto-hides once the page is ready.

## Mobile / web notes

- Use a deployed **HTTPS** URL (or `npx netlify dev`) — `localhost` won't work on a phone
- Chrome on iOS uses WebKit; grant camera permission in system settings if blocked
- iOS exposes no zoom API, so framing falls back to on-screen positioning guidance
- Add to Home Screen works as a PWA (`manifest.webmanifest`); the native app adds haptics and keep-awake
- Screen Wake Lock keeps the display on while training where supported

## Known limitations

- Cannot verify physical equipment (bars, Bosu, etc.)
- Chin-up vs pull-up grip is skill selection, not auto-detected
- Pose quality depends on lighting and keeping the full body in frame
- Target poses are canonical 2D silhouettes; Learn-mode arrows are guidance, not biomechanical ground truth

## License

MIT
