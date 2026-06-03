export type VersionMeta = {
  version: string;
  deployedAtIso: string; // ISO 8601 with offset
  notes: string[];
};

export const VERSION_HISTORY: VersionMeta[] = [
  {
    version: "0.9.0",
    deployedAtIso: "AUTO",
    notes: [
      "Share your result: Wordle-style emoji grid + stats, one tap to copy or share.",
      "Practice scrambles are now replayable — share a link and a friend plays the exact same puzzle.",
      "Custom Complexity: pick any target PAR (1–20) for a practice scramble.",
      "Fixed: PAR 1 results now record correctly on the leaderboard.",
      "Fixed: the leaderboard no longer stores duplicate entries for the same run.",
      "Fixed: the side buttons are no longer clipped on small screens.",
      "Privacy-first analytics (no tracking cookies, no IP collection) to learn what to improve.",
    ],
  },
  {
    version: "0.8.0",
    deployedAtIso: "AUTO",
    notes: [
      "New UI: bottom navigation with 5 sections (Profile, Leaderboard, Daily, Practice, Settings).",
      "Composite Bunt R G B logo as SVG, adapts to light/dark theme.",
      "HINT and PAST SCRAMBLES moved to sidebar icon buttons next to the grid.",
      "Stats row redesigned: PAR / TIME / MOVES / SCORE inline.",
      "Practice mode: EASY / MEDIUM / HARD difficulty pills (PAR 3 / 8 / 15) + Custom Complexity placeholder.",
      "Dark mode: auto-detect (prefers-color-scheme) + manual toggle (sun/moon) + 3-state pref in Settings (light / dark / system), persisted in localStorage.",
      "Refactor: App.tsx 1726 → 469 lines. Logic split into lib/, hooks/, components/{icons,layout,modals,game}/, screens/, styles/.",
      "CSS variables drive the full theme (bg, fg, border, modal surface) — no more hardcoded #fff / #000.",
      "Reusable ModalShell with ESC + outside-click + body scroll lock.",
      "Cleanup: removed App.tsx.BROKEN.bak and unused App.css.",
    ],
  },
  {
    version: "0.7.0",
    deployedAtIso: "AUTO",
    notes: [
      "UI: moved the Daily Scramble label + countdown under the grid (above the main buttons).",
      "UI: added a consistent z-index scale so modals always stay above side buttons.",
      "Past Scrambles modal: improved loading/error state message + retry button (local shows error until API is wired).",
    ],
  },
  {
    version: "0.6.0",
    deployedAtIso: "AUTO",
    notes: [
      "Daily is now the single official puzzle for the day (loaded from the server).",
      "Daily progress is saved locally and resumes if you refresh the page.",
      "If the server is unreachable, the game only resumes a previously saved Daily (no fake new Daily).",
      "Practice mode: PAR slider + generator for the selected difficulty.",
      "Leaderboards v2: Local (Daily + Practice by PAR) and Global wiring (may be disabled in preview builds).",
      "Build stability: cleaned up unused code that was breaking the production build.",
      "Dev workflow: aligned local and Vercel preview to avoid version drift.",
    ],
  },
  {
    version: "0.5.0",
    deployedAtIso: "AUTO",
    notes: [
      "Practice: PAR target now matches the selected value.",
      "Practice: added Reset button.",
      "UI: added quick links (Official Website + Devlog).",
      "UI: replaced timer hint with a short move explanation.",
      "Added contextual help: '?' button near the grid opens a mini help modal.",
      "Removed the inline hint text under the title (moved into the help modal).",
      "Improved modals UX: consistent top-right close '×' (Version history / Share / Feedback).",
    ],
  },
  {
    version: "0.4.0",
    deployedAtIso: "2026-02-22T17:44:38+01:00",
    notes: [
      "Math fix: generation now applies inverse Z3 moves (mod 3)",
      "PAR now reflects solver-consistent minimum clicks",
      "Practice mode generates puzzles with exact requested PAR",
      "Easy mode verified at real PAR 3 (solver-validated)",
      "Eliminated generator/solver rule mismatch",
    ],
  },
  {
    version: "0.3.0",
    deployedAtIso: "2026-02-22T15:18:09+01:00",
    notes: [
      "Added SHARE modal with WhatsApp, Telegram, X, Email, Copy",
      "Improved modal scroll lock handling",
      "Reset now restores original puzzle state (no regeneration)",
      "Practice mode now allows manual PAR selection",
      "Share + Practice buttons aligned on same row",
      "UI spacing and button sizing improvements",
    ],
  },
  {
    version: "0.2.0",
    deployedAtIso: "2026-02-22T13:40:11+00:00",
    notes: ["Version badge + status", "Feedback button (anonymous form link)", "Version history panel", "Favicon"],
  },
  {
    version: "0.1.0",
    deployedAtIso: "2026-02-20T18:44:33+01:00",
    notes: [
      "Core 5×5 puzzle (3 colors)",
      "Timer + clicks + efficiency score",
      "Local leaderboards (easy/medium/random)",
      "Practice mode",
      "Run-state persistence (non-random only)",
    ],
  },
];