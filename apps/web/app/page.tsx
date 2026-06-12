import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold tracking-tight">
        Calisthenics Form Tracker
      </h1>
      <p className="mb-8 text-lg text-muted">
        Auto hold timers, form coaching, and progress tracking for 21 calisthenics
        skills — all processed locally in your browser.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/skills"
          className="rounded-xl bg-accent px-6 py-3 font-semibold text-bg hover:bg-accent/90"
        >
          Start Training
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-surface"
        >
          View Dashboard
        </Link>
      </div>
      <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
        {[
          {
            title: "Auto hold timer",
            desc: "Starts when you enter the hold, stops when you drop. Perfect form or hold-only modes.",
          },
          {
            title: "Live coaching",
            desc: "Real-time cues and personalized drill plans based on your weak points.",
          },
          {
            title: "Smooth detection",
            desc: "Web Worker pose pipeline with 60fps interpolated overlay — no main-thread jank.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl bg-surface p-5">
            <h3 className="mb-2 font-semibold text-accent">{f.title}</h3>
            <p className="text-sm text-muted">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
