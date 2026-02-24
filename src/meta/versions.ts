export type VersionMeta = {
  version: string;
  deployedAtIso: string; // ISO 8601 with offset
  notes: string[];
};

export const VERSION_HISTORY: VersionMeta[] = [
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
    notes: [
      "Version badge + status",
      "Feedback button (anonymous form link)",
      "Version history panel",
      "Favicon",
    ],
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