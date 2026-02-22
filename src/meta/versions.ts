export type VersionMeta = {
  version: string;            // "0.2.0"
  deployedAtIso: string;      // "2026-02-22T11:34:00+01:00" (manuale per ora)
  notes: string[];            // bullet list
};

export const VERSION_HISTORY: VersionMeta[] = [
  {
    version: "0.2.0",
    deployedAtIso: "TBD",
    notes: [
      "Version badge + status",
      "Feedback button (anonymous form link)",
      "Version history panel",
      "Favicon",
    ],
  },
  {
    version: "0.1.0",
    deployedAtIso: "TBD",
    notes: [
      "Core 5×5 puzzle (3 colors)",
      "Timer + clicks + efficiency score",
      "Local leaderboards (easy/medium/random)",
      "Practice mode",
      "Run-state persistence (non-random only)",
    ],
  },
];