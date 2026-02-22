import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "./_lib/supabaseAdmin";
import { verifyRunToken } from "./_lib/token";
import { rateLimitOrThrow } from "./_lib/rateLimit";

function getIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

function computeEfficiency(par: number, clicks: number): number {
  if (par <= 0) return 0;
  if (clicks <= 0) return 0;
  const eff = par / clicks;
  const clamped = Math.max(0, Math.min(1, eff));
  return Math.round(10000 * clamped);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const ip = getIp(req);
    rateLimitOrThrow({ key: `score:${ip}`, limit: 10, windowMs: 60_000 });

    const { token, timeMs, clicks, par, nickname, appVersion } = req.body ?? {};

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "missing_token" });
      return;
    }

    const payload = verifyRunToken(token);
    if (!payload) {
      res.status(400).json({ error: "invalid_or_expired_token" });
      return;
    }

    const { nonce, mode } = payload;

    if (
      typeof timeMs !== "number" ||
      typeof clicks !== "number" ||
      typeof par !== "number"
    ) {
      res.status(400).json({ error: "invalid_numbers" });
      return;
    }

    // Sanity checks
    if (timeMs < 1500 || timeMs > 60 * 60 * 1000) {
      res.status(400).json({ error: "invalid_time_range" });
      return;
    }

    if (clicks < 1 || clicks > 500) {
      res.status(400).json({ error: "invalid_clicks_range" });
      return;
    }

    if (par < 1 || par > 200) {
      res.status(400).json({ error: "invalid_par_range" });
      return;
    }

    // Check nonce exists and unused
    const nonceRow = await supabaseAdmin
      .from("nonces")
      .select("nonce, used_at, expires_at")
      .eq("nonce", nonce)
      .single();

    if (nonceRow.error || !nonceRow.data) {
      res.status(400).json({ error: "nonce_not_found" });
      return;
    }

    if (nonceRow.data.used_at) {
      res.status(400).json({ error: "nonce_already_used" });
      return;
    }

    const expiresAt = new Date(nonceRow.data.expires_at).getTime();
    if (Date.now() > expiresAt) {
      res.status(400).json({ error: "nonce_expired" });
      return;
    }

    // Mark nonce as used
    const update = await supabaseAdmin
      .from("nonces")
      .update({ used_at: new Date().toISOString() })
      .eq("nonce", nonce);

    if (update.error) {
      res.status(500).json({ error: "nonce_update_failed" });
      return;
    }

    const efficiency_score = computeEfficiency(par, clicks);

    const insert = await supabaseAdmin.from("scores").insert({
      mode,
      nickname: typeof nickname === "string" ? nickname : null,
      time_ms: timeMs,
      clicks,
      par,
      efficiency_score,
      app_version: typeof appVersion === "string" ? appVersion : null,
    });

    if (insert.error) {
      res.status(500).json({ error: "score_insert_failed", details: insert.error.message });
      return;
    }

    res.status(200).json({ ok: true, efficiency_score });
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    if (status === 429) {
      res.setHeader("Retry-After", String(e.retryAfterSec ?? 60));
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    res.status(500).json({ error: "server_error" });
  }
}