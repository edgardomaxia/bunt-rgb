// api/daily.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { encodeGridToBase3, decodeGridFromBase3 } from "../src/meta/colorCodec";
type DailyRow = {
  daily_id: string;
  daily_num: number;
  seed: string;
  par: number;
  grid: unknown; // jsonb (legacy)
  grid_code?: string | null; // new
  created_at: string;
};

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

    // dynamic import (keeps bundler happy with Node16/ESM)
    const { generateDailyToday } = await import("./_lib/dailyGen.js");
    const g = generateDailyToday();

    // 1) try read
    const { data: existing, error: readErr } = await supabase
      .from("daily_puzzles")
      .select("*")
      .eq("daily_id", g.dailyId)
      .maybeSingle<DailyRow>();

    if (readErr) throw readErr;

    if (existing) {
  const grid =
    typeof existing.grid_code === "string" && existing.grid_code.length
      ? decodeGridFromBase3(existing.grid_code)
      : (existing.grid as any);

  return res.status(200).json({
    ok: true,
    dailyId: existing.daily_id,
    dailyNum: existing.daily_num,
    dailyNumStr: String(existing.daily_num).padStart(4, "0"),
    seed: existing.seed,
    par: existing.par,
    grid,
  });
}

    // 2) insert once
    const payload = {
  daily_id: g.dailyId,
  daily_num: g.dailyNum,
  seed: g.seed,
  par: g.par,
  grid: g.grid,
  grid_code: encodeGridToBase3(g.grid),
};

    const { error: insErr } = await supabase.from("daily_puzzles").insert(payload);

    if (insErr) {
      // Race: another request inserted first → re-read and return
      const { data: retry, error: retryErr } = await supabase
        .from("daily_puzzles")
        .select("*")
        .eq("daily_id", g.dailyId)
        .maybeSingle<DailyRow>();

      if (retryErr || !retry) throw insErr;

const grid =
  typeof retry.grid_code === "string" && retry.grid_code.length
    ? decodeGridFromBase3(retry.grid_code)
    : (retry.grid as any);

return res.status(200).json({
  ok: true,
  dailyId: retry.daily_id,
  dailyNum: retry.daily_num,
  dailyNumStr: String(retry.daily_num).padStart(4, "0"),
  seed: retry.seed,
  par: retry.par,
  grid,
});
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      detail: String(e?.message ?? e),
    });
  }
}