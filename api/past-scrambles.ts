import { createClient } from "@supabase/supabase-js";

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
    const limit = Math.max(1, Math.min(90, Number(limitRaw ?? 24) || 24));

    const { data, error } = await supabase
      .from("daily_scrambles")
      .select("daily_id,daily_number,par,grid")
      .order("daily_number", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // output shape expected by the app
    return res.status(200).json({
      ok: true,
      items: (data ?? []).map((r: any) => ({
        dailyId: r.daily_id,
        number: r.daily_number,
        par: r.par,
        grid: r.grid,
      })),
    });
  } catch (e: any) {
    console.error("[api/past-scrambles] error", e);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}