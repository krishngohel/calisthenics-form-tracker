/** The app mark: a handstand inside a timer ring. Same artwork as the icon. */
export function AppMark({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="cft-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f4f4a" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="224" fill="url(#cft-bg)" />
      <circle cx="512" cy="560" r="300" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="80" />
      <path d="M292 356 A300 300 0 1 0 732 356" fill="none" stroke="#ffffff" strokeWidth="80" strokeLinecap="round" />
      <g stroke="#ffffff" strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M430 790 L512 612 L594 790" />
        <path d="M512 612 V420" />
        <path d="M412 236 L512 420 L612 236" />
      </g>
      <circle cx="512" cy="700" r="46" fill="#ffffff" />
    </svg>
  );
}
