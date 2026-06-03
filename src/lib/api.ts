import { SIZE } from "../engine/engine";
import type { Color } from "../engine/types";

export type DailyApiResponse = {
  ok: boolean;
  dailyId: string;
  par: number;
  grid: Color[];
};

export type DailyFetchResult =
  | { ok: true; dailyId: string; par: number; grid: Color[] }
  | { ok: false; reason: string };

export async function fetchDaily(): Promise<DailyFetchResult> {
  try {
    const res = await fetch("/api/daily", { cache: "no-store" });
    const data = (await res.json()) as Partial<DailyApiResponse>;
    if (!data?.ok) return { ok: false, reason: "api not ok" };

    const dailyId = String(data.dailyId ?? "");
    const par = Number(data.par) || 0;
    const grid = (data.grid as Color[] | undefined)?.slice?.();
    if (!grid || grid.length !== SIZE * SIZE) {
      return { ok: false, reason: "grid invalid" };
    }
    return { ok: true, dailyId, par, grid };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "network error" };
  }
}

export type PastScramble = {
  dailyId: string;
  number: number;
  par: number;
  grid: Color[];
};

export async function fetchPastScrambles(limit = 30): Promise<PastScramble[]> {
  const res = await fetch(`/api/past-scrambles?limit=${limit}`, { cache: "no-store" });
  const data = (await res.json()) as { ok?: boolean; items?: PastScramble[] };
  if (!data?.ok || !Array.isArray(data.items)) return [];
  return data.items.filter(
    (it) => Array.isArray(it.grid) && it.grid.length === SIZE * SIZE
  );
}
