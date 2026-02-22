import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { mintRunToken, type RunMode } from "./_lib/token.js";
import { rateLimitOrThrow } from "./_lib/rateLimit.js";

const TTL_SECONDS = 10 * 60; // 10 minutes

function getIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const ip = getIp(req);
    rateLimitOrThrow({ key: `run-token:${ip}`, limit: 30, windowMs: 60_000 });

    const mode = (req.body?.mode ?? "") as RunMode;
    if (mode !== "easy" && mode !== "medium" && mode !== "random") {
      res.status(400).json({ error: "invalid_mode" });
      return;
    }

    const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

    const insert = await supabaseAdmin
      .from("nonces")
      .insert({ expires_at: expiresAt, mode })
      .select("nonce")
      .single();

    if (insert.error) {
      res.status(500).json({ error: "db_insert_failed", details: insert.error.message });
      return;
    }

    const nonce = insert.data.nonce as string;
    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;

    const token = mintRunToken({ nonce, mode, exp });

    res.status(200).json({ token, exp });
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