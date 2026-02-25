// api/daily.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

import { makeSeededRng, generatePlantedParInRange, SIZE } from "../src/engine/engine";
import type { Color } from "../src/engine/types";

function utcDailyId(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabase = createClient(mustEnv("SUPABASE_URL"), mustEnv("SUPABASE_SERVICE_ROLE_KEY"));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const dailyId = utcDailyId();

    const { data: existing, error: readErr } = await supabase
      .from("daily_puzzles")
      .select("daily_id, seed, par, grid, created_at")
      .eq("daily_id", dailyId)
      .maybeSingle();

    if (readErr) throw readErr;

    if (existing?.grid && existing?.par != null) {
      return res.status(200).json({
        dailyId: existing.daily_id,
        seed: existing.seed,
        par: existing.par,
        grid: existing.grid,
        createdAt: existing.created_at,
        source: "db",
      });
    }

    const seed = `daily:${dailyId}`;
    const rng = makeSeededRng(seed);

    const g = generatePlantedParInRange(8, 19, rng, 1200);

    if (!Array.isArray(g.grid) || g.grid.length !== SIZE * SIZE) {
      throw new Error("Generated grid invalid");
    }

    const payload = {
      daily_id: dailyId,
      seed,
      par: g.par,
      grid: g.grid as Color[],
    };

    const { data: saved, error: upsertErr } = await supabase
      .from("daily_puzzles")
      .upsert(payload, { onConflict: "daily_id" })
      .select("daily_id, seed, par, grid, created_at")
      .single();

    if (upsertErr) throw upsertErr;

    return res.status(200).json({
      dailyId: saved.daily_id,
      seed: saved.seed,
      par: saved.par,
      grid: saved.grid,
      createdAt: saved.created_at,
      source: "generated",
    });
  } catch (e: any) {
    console.error("api/daily error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}