import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

type Mode = "easy" | "medium" | "random";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const mode = (req.query.mode ?? "") as Mode;
    if (mode !== "easy" && mode !== "medium" && mode !== "random") {
      res.status(400).json({ error: "invalid_mode" });
      return;
    }

    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === "string" ? Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 10)) : 10;

    const q = await supabaseAdmin
      .from("scores")
      .select("mode,nickname,time_ms,clicks,par,efficiency_score,created_at,app_version")
      .eq("mode", mode)
      .order("efficiency_score", { ascending: false })
      .order("time_ms", { ascending: true })
      .order("clicks", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q.error) {
      res.status(500).json({ error: "db_query_failed", details: q.error.message });
      return;
    }

    res.status(200).json({ mode, items: q.data ?? [] });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
}