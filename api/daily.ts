// api/daily.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type Color = "red" | "green" | "blue";

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

// --- codec inline (NO imports from src/) ---
const colorToDigit = (c: Color): "0" | "1" | "2" => {
  switch (c) {
    case "red":
      return "0";
    case "green":
      return "1";
    case "blue":
      return "2";
  }
};

const digitToColor = (d: string): Color => {
  switch (d) {
    case "0":
      return "red";
    case "1":
      return "green";
    case "2":
      return "blue";
    default:
      return "red";
  }
};

const encodeGridToBase3 = (grid: Color[]): string => grid.map(colorToDigit).join("");
const decodeGridFromBase3 = (s: string): Color[] => s.split("").map(digitToColor);

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

    // NOTE: questo path deve esistere davvero sul server
    // Se il file è TS, lascia .js SOLO se nel repo c'è davvero dailyGen.js
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

    // 2) Insert once
    const payload = {
      daily_id: g.dailyId,
      daily_num: g.dailyNum,
      seed: g.seed,
      par: g.par,
      grid: g.grid, // keep legacy for now
      grid_code: encodeGridToBase3(g.grid as Color[]),
    };

    const { error: insErr } = await supabase.from("daily_puzzles").insert(payload);

    // 3) ALWAYS re-read and return the row from DB
    const { data: fresh, error: freshErr } = await supabase
      .from("daily_puzzles")
      .select("*")
      .eq("daily_id", g.dailyId)
      .maybeSingle<DailyRow>();

    if (freshErr) throw freshErr;
    if (!fresh) {
      // se insert è fallito per race, qui dovremmo comunque trovare la row
      // se non la troviamo, vogliamo vedere sia insErr che stato
      throw new Error(`daily_re_read_failed insErr=${String(insErr?.message ?? insErr)}`);
    }

    return res.status(200).json(rowToResponse(fresh));
  } catch (e: any) {
    const detail = {
      message: String(e?.message ?? e),
      name: e?.name ?? null,
      stack: e?.stack ? String(e.stack).split("\n").slice(0, 12) : null,
      code: e?.code ?? null,
    };
    return res.status(500).json({
      ok: false,
      error: "server_error",
      detail,
    });
  }
}
