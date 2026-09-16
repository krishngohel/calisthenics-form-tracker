/**
 * Supabase connection settings. Kept free of imports so it is safe to load in
 * the Edge middleware as well as in the browser and server clients.
 */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-key";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_KEY;

/**
 * True when real Supabase credentials are present. Without them the app runs
 * fully offline: training works, nothing is saved, and auth UI is hidden.
 */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL !== PLACEHOLDER_URL &&
    SUPABASE_ANON_KEY !== PLACEHOLDER_KEY &&
    !SUPABASE_URL.includes("your-project") &&
    SUPABASE_ANON_KEY !== "your-anon-key"
  );
}
