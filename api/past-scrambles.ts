import { createClient } from "@supabase/supabase-js";

type Color = "red" | "green" | "blue";

// inline codec (no imports from src/)
const digitToColor = (d: string): Color => (d === "1" ? "green" : d === "2" ? "blue" : "red");
const decodeGridFromBase3 = (s: string): Color[] => s.split("").map(digitToColor);

export default async function handler(req: any, res: any) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    const limitRaw = Array.isArray(req.query?.limit) ? req.query.limit[0] : req.query?.limit;
    const limit = Math.max(1, Math.min(90, Number(limitRaw ?? 30) || 30));

    // Source of truth is daily_puzzles (same table api/daily.ts writes to).
    const { data, error } = await supabase
      .from("daily_puzzles")
      .select("daily_id,daily_num,par,grid,grid_code")
      .order("daily_num", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      items: (data ?? []).map((r: any) => ({
        dailyId: r.daily_id,
        number: r.daily_num,
        par: r.par,
        grid:
          typeof r.grid_code === "string" && r.grid_code.length === 25
            ? decodeGridFromBase3(r.grid_code)
            : r.grid,
      })),
    });
  } catch (e: any) {
    console.error("[api/past-scrambles] error", e);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}
