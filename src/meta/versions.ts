export type VersionMeta = {
  version: string;            // "0.2.0"
  deployedAtIso: string;      // "2026-02-22T11:34:00+01:00" (manuale per ora)
  notes: string[];            // bullet list
};

export const VERSION_HISTORY: VersionMeta[] = [
  {
    version: "0.2.0",
    deployedAtIso: "2026-02-22T13:40:11Z",
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