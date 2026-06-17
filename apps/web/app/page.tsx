import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
        Train smarter
      </p>
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Calisthenics Form Tracker
      </h1>
      <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted">
        Auto hold timers, live form coaching, and progress tracking — all processed
        locally in your browser.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/skills" className="btn-primary">
          Start Training
        </Link>
        <Link href="/skills" className="btn-secondary">
          Browse Learning Paths
        </Link>
      </div>
      <div className="mt-16 grid gap-5 text-left sm:grid-cols-3">
        {[
          {
            title: "Auto hold timer",
            desc: "Starts when you enter the hold, stops when you drop. Perfect form or hold-only modes.",
            emoji: "⏱",
          },
          {
            title: "Live coaching",
            desc: "Real-time cues and personalized drill plans based on your weak points.",
            emoji: "✨",
          },
          {
            title: "Smooth detection",
            desc: "Web Worker pose pipeline with 60fps interpolated overlay — no main-thread jank.",
            emoji: "📷",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="card-interactive p-6"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-lg">
              {f.emoji}
            </span>
            <h3 className="mb-2 font-semibold text-accent-hover">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
