// api/_lib/dailyGen.ts
import { makeSeededRng, generatePlantedParInRange } from "../../src/engine/engine";

export type DailyGenResult = {
  dailyId: string; // "YYYY-MM-DD" (UTC)
  seed: string; // "daily:YYYY-MM-DD"
  par: number;
  grid: unknown; // Color[] serialized as jsonb-friendly array
};

export function utcDailyId(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Deterministic daily generator (same output for same UTC date).
 * Range/par tuning can be changed centrally here.
 */
export function generateDailyForId(dailyId: string): DailyGenResult {
  const seed = `daily:${dailyId}`;
  const rng = makeSeededRng(seed);

  // Your chosen range (8..19) and attempts (1200) — tune here.
  const g = generatePlantedParInRange(8, 19, rng, 1200);

  return {
    dailyId,
    seed,
    par: g.par,
    grid: g.grid,
  };
}

/**
 * Convenience helper: generate for today (UTC).
 */
export function generateDailyToday(): DailyGenResult {
  return generateDailyForId(utcDailyId());
}