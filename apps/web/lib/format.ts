/** 12.34s style, hundredths precision. */
export function formatMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const s = Math.floor(clamped / 1000);
  const cs = Math.floor((clamped % 1000) / 10);
  return `${s}.${cs.toString().padStart(2, "0")}s`;
}

/** 12.3s style, tenths precision. */
export function formatSec(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}
