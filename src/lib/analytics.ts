import type { PostHog } from "posthog-js";

// Privacy-first PostHog wrapper. No-op unless VITE_PUBLIC_POSTHOG_KEY is set,
// so dev/build stay unaffected until analytics is configured.
//
// posthog-js is lazy-loaded (dynamic import) so it ships as a separate async
// chunk and never bloats the initial bundle — the game stays fast to first play.
//
// Ingestion is proxied through our own domain (/ingest, see vercel.json) to
// dodge the adblockers our nerd/puzzle audience heavily uses. No PII: only the
// anonymous distinct_id PostHog stores in localStorage (no identify() call).

let ph: PostHog | null = null;

export async function initAnalytics() {
  if (typeof window === "undefined") return;
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "/ingest",
    ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST || "https://us.posthog.com",
    capture_pageview: false, // SPA: we emit screen_viewed manually
    autocapture: false, // explicit events only — no noisy DOM capture
    disable_session_recording: true,
    persistence: "localStorage",
    person_profiles: "identified_only", // stay anonymous; still powers retention/funnels
  });
  ph = posthog;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!ph) return;
  ph.capture(event, props);
}

export type ScreenName = "daily" | "practice" | "leaderboard" | "profile" | "settings";

export function trackScreen(screen: ScreenName) {
  track("screen_viewed", { screen });
}
