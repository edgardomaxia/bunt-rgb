// api/daily.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { generateDailyToday } from "./_lib/dailyGen";

type DailyRow = {
  daily_id: string;
  seed: string;
  par: number;
  grid: unknown; // jsonb
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

    const g = generateDailyToday();
    const dailyId = g.dailyId;

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
        seed: existing.seed,
        par: existing.par,
        grid: existing.grid,
      });
    }

    // 2) insert once
    const payload = {
      daily_id: g.dailyId,
      seed: g.seed,
      par: g.par,
      grid: g.grid,
    };

    const { error: insErr } = await supabase.from("daily_puzzles").insert(payload);

    if (insErr) {
      // Race: another request inserted first → re-read and return
      const { data: retry, error: retryErr } = await supabase
        .from("daily_puzzles")
        .select("*")
        .eq("daily_id", dailyId)
        .maybeSingle<DailyRow>();

      if (retryErr || !retry) throw insErr;

      return res.status(200).json({
        ok: true,
        dailyId: retry.daily_id,
        seed: retry.seed,
        par: retry.par,
        grid: retry.grid,
      });
    }

    return res.status(200).json({
      ok: true,
      dailyId: g.dailyId,
      seed: g.seed,
      par: g.par,
      grid: g.grid,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      detail: String(e?.message ?? e),
    });
  }
}