// api/daily.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

import { makeSeededRng, generatePlantedParInRange } from "../src/engine/engine";

type DailyRow = {
  daily_id: string;
  daily_num: number;
  seed: string;
  par: number;
  grid: unknown; // jsonb
  initial_grid: unknown; // jsonb
  algo_version: string | null;
  created_at: string;
};

// YYYY-MM-DD in UTC
function utcDailyId(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ====== EPOCH: oggi = #0001 ======
const DAILY_EPOCH_UTC = "2026-02-25"; // <- cambia solo se vuoi

function dailyNumberFromId(dailyId: string) {
  const [ey, em, ed] = DAILY_EPOCH_UTC.split("-").map(Number);
  const [y, m, d] = dailyId.split("-").map(Number);

  const epoch = Date.UTC(ey, em - 1, ed, 0, 0, 0, 0);
  const cur = Date.UTC(y, m - 1, d, 0, 0, 0, 0);

  const diffDays = Math.floor((cur - epoch) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ ok: false, error: "missing_env" });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const dailyId = utcDailyId();
    const dailyNum = dailyNumberFromId(dailyId);
    const seed = `daily:${dailyId}`;
    const algoVersion = "v1";

    // 1) try read
    const { data: existing, error: readErr } = await supabase
      .from("daily_puzzles")
      .select("*")
      .eq("daily_id", dailyId)
      .maybeSingle<DailyRow>();

    if (readErr) throw readErr;

    if (existing) {
      return res.status(200).json({
        ok: true,
        dailyId: existing.daily_id,
        dailyNum: existing.daily_num,
        seed: existing.seed,
        par: existing.par,
        grid: existing.grid,
        initialGrid: existing.initial_grid ?? existing.grid,
        algoVersion: existing.algo_version ?? algoVersion,
      });
    }

    // 2) generate deterministic
    const rng = makeSeededRng(seed);
    const g = generatePlantedParInRange(8, 19, rng, 1200);

    const payload = {
      daily_id: dailyId,
      daily_num: dailyNum,
      seed,
      par: g.par,
      grid: g.grid,
      initial_grid: g.grid,
      algo_version: algoVersion,
    };

    // 3) upsert (race-safe)
    const { data: up, error: upErr } = await supabase
      .from("daily_puzzles")
      .upsert(payload, { onConflict: "daily_id" })
      .select("*")
      .single<DailyRow>();

    if (upErr) throw upErr;

    return res.status(200).json({
      ok: true,
      dailyId: up.daily_id,
      dailyNum: up.daily_num,
      seed: up.seed,
      par: up.par,
      grid: up.grid,
      initialGrid: up.initial_grid ?? up.grid,
      algoVersion: up.algo_version ?? algoVersion,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      detail: String(e?.message ?? e),
    });
  }
}