# Calisthenics Form Tracker (CFT)

Web-first calisthenics trainer with **live pose tracking**, **auto hold timers**, and **rule-based form coaching** — no video upload, no model training on your data.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## Features

- **29 skills** across pulls, pushes, static holds, planche progressions, Bosu, and legs
- **Auto hold timer** — starts the instant you enter a hold, stops immediately on drop
- **Auto-detect mode** — camera guesses which skill you're doing (`/train`)
- **Hold Only vs Perfect Form** — stricter criteria and extra metrics in perfect mode
- **Live coaching cues** — geometry rules fire research-backed tips; cues stay on screen until dismissed
- **Session progress chart** — form score over time while holding
- **Pose pipeline** — Web Worker, MoveNet (default) or MediaPipe, optional hand landmarks for fingertip overlay
- **Distance-aware tracking** — adapts when you step back for full-body framing
- **Device performance tiers** — auto-adjusts detection FPS and smoothing (low / medium / high)
- **Supabase dashboard** — sign in, save sessions, view history and coaching plans

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/calisthenics-form-tracker.git
cd calisthenics-form-tracker
npm install

cp apps/web/.env.example apps/web/.env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# Run supabase/migrations/001_initial.sql in your Supabase project

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

Use **Skills** to pick a move, or **Auto-detect** to let the app lock on after ~1s of stable pose.

## Project structure

```
calisthenics-form-tracker/
├── apps/web/              Next.js 14 + Tailwind UI
│   ├── app/               Routes (train, skills, dashboard, auth)
│   ├── components/        Camera, coaching, timer
│   ├── hooks/             Pose detection, cues, session progress
│   └── workers/           Pose inference Web Worker
├── packages/core/         Shared skill rules, hold FSM, pose geometry, scoring
└── supabase/              SQL migrations for sessions & coaching plans
```

## How coaching works

Everything runs **locally in the browser**:

1. A pretrained pose model (MoveNet or MediaPipe) outputs body landmarks
2. Per-skill **geometry rules** in `packages/core` measure angles, lines, and positions
3. Failed metrics produce **live cues** and post-session **progression drills**
4. No cloud inference, no fine-tuning on user video

Visit `/dev/pose-benchmark` to compare providers on your device. The winner is saved to `localStorage` as `cft-body-provider`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:clean -w apps/web` | Delete `.next` and restart dev |
| `npm run build` | Production build |
| `npm run lint` | ESLint (web app) |
| `npm run test -w @cft/core` | Vitest unit tests |

## Deploy (Netlify)

1. Push to GitHub and import the repo in [Netlify](https://app.netlify.com)
2. Set **Base directory** to `apps/web` (uses `netlify.toml`)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — HTTPS is required for camera access

## Mobile / iOS notes

- Use a deployed **HTTPS** URL (or `npx netlify dev`) — `localhost` won't work on a phone
- Chrome on iOS uses WebKit; grant camera permission in system settings if blocked
- `@cft/core` is platform-agnostic for a future Expo app

## Known limitations

- Cannot verify physical equipment (bars, Bosu, etc.)
- Chin-up vs pull-up grip is skill selection, not auto-detected
- Pose quality depends on lighting and keeping the full body in frame

## License

MIT
