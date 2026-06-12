# Calisthenics Form Tracker

Web-first calisthenics form tracker with auto hold timers, live coaching, and progress dashboard.

## Features

- **20 calisthenics skills** — pull-ups through nordic curls
- **Auto hold timer** — starts on hold entry, stops on drop
- **Perfect Form vs Hold Only** modes
- **Smooth pose pipeline** — Web Worker + MoveNet (default) + lazy HandLandmarker
- **Coaching plans** — weak-point drills after each session
- **Supabase auth & dashboard** — progress charts and session history

## Setup

```bash
cd calisthenics-form-tracker
npm install
cp apps/web/.env.example apps/web/.env.local
# Add Supabase URL and anon key, then run migration in supabase/migrations/001_initial.sql

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
calisthenics-form-tracker/
├── apps/web/          Next.js 14 app
├── packages/core/     Shared skill rules, hold FSM, pose utils
└── supabase/          DB migrations
```

## Pose benchmark

Visit `/dev/pose-benchmark` to compare MoveNet vs MediaPipe Pose Lite on your device. The recommended provider is stored in `localStorage` as `cft-body-provider`.

## Performance profiles

`packages/core` auto-detects device tier (low/medium/high) and adjusts detection FPS and smoothing.

## Mobile path

`@cft/core` is designed for reuse in a future Expo app. Skill evaluators and hold logic are platform-agnostic.

## Known limitations

- Cannot verify physical equipment (bar, Bosu)
- Chin-up vs pull-up grip is user-selected
- Pose estimation requires good lighting and full body in frame
