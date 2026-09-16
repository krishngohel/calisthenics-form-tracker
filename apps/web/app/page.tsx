import Link from "next/link";

const FEATURES = [
  {
    title: "Auto hold timer",
    desc: "Starts the frame you enter the hold, stops the frame you leave it. Voice count-outs so you never look down.",
    emoji: "⏱",
  },
  {
    title: "Live coaching",
    desc: "Rule-based cues on your form, a ghost pose fitted to your body, and drill plans built from your weak points.",
    emoji: "✨",
  },
  {
    title: "Private by design",
    desc: "Pose detection runs on your device. No video ever leaves your phone.",
    emoji: "🔒",
  },
];

export default function HomePage() {
  return (
    <div className="page text-center">
      <div className="py-6 sm:py-12">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm">Train smarter</p>
        <h1 className="mx-auto mb-4 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Calisthenics Form Tracker
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Auto hold timers, live form coaching, and progress tracking — all processed locally in your browser.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/train" className="btn-primary text-base">
            Start training
          </Link>
          <Link href="/skills" className="btn-secondary text-base">
            Browse learning paths
          </Link>
        </div>
      </div>
      <div className="mt-6 grid gap-4 text-left sm:mt-10 sm:grid-cols-3 sm:gap-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-5 sm:p-6">
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-xl">
              {f.emoji}
            </span>
            <h3 className="mb-1.5 text-base font-bold text-foreground">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
