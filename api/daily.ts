// api/daily.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { encodeGridToBase3, decodeGridFromBase3 } from "../src/meta/colorCodec";

type DailyRow = {
  daily_id: string;
  daily_num: number;
  seed: string;
  par: number;
  grid: unknown; // legacy jsonb
  grid_code?: string | null; // new compact format
  created_at: string;
};

function noCache(res: VercelResponse) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function rowToResponse(row: DailyRow) {
  const grid =
    typeof row.grid_code === "string" && row.grid_code.length
      ? decodeGridFromBase3(row.grid_code)
      : (row.grid as any);

  return {
    ok: true as const,
    dailyId: row.daily_id,
    dailyNum: row.daily_num,
    dailyNumStr: String(row.daily_num).padStart(4, "0"),
    seed: row.seed,
    par: row.par,
    grid,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noCache(res);

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

    // 1) Try read (DB is source-of-truth)
    const { data: existing, error: readErr } = await supabase
      .from("daily_puzzles")
      .select("*")
      .eq("daily_id", g.dailyId)
      .maybeSingle<DailyRow>();

    if (readErr) throw readErr;
    if (existing) return res.status(200).json(rowToResponse(existing));

    // 2) Insert once (still return DB row afterwards)
    const payload = {
      daily_id: g.dailyId,
      daily_num: g.dailyNum,
      seed: g.seed,
      par: g.par,
      grid: g.grid, // keep legacy for now
      grid_code: encodeGridToBase3(g.grid),
    };

    const { error: insErr } = await supabase.from("daily_puzzles").insert(payload);

    if (insErr) {
      // Race: another request inserted first → fall through to re-read
      // If it's a different error, re-read may still fail and we'll throw below.
    }

    // 3) ALWAYS re-read and return the row from DB
    const { data: fresh, error: freshErr } = await supabase
      .from("daily_puzzles")
      .select("*")
      .eq("daily_id", g.dailyId)
      .maybeSingle<DailyRow>();

    if (freshErr) throw freshErr;
    if (!fresh) throw new Error("daily_re_read_failed");

    return res.status(200).json(rowToResponse(fresh));
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      detail: String(e?.message ?? e),
    });
  }
}