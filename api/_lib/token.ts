import crypto from "crypto";

export type RunMode = "easy" | "medium" | "random";

type Payload = {
  nonce: string; // uuid
  mode: RunMode;
  exp: number; // unix seconds
};

const secret = process.env.BUNT_TOKEN_SECRET;
if (!secret) throw new Error("Missing env BUNT_TOKEN_SECRET");

const b64url = (buf: Buffer) =>
  buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const b64urlJson = (obj: unknown) => b64url(Buffer.from(JSON.stringify(obj), "utf8"));

const sign = (payloadB64: string) =>
  b64url(crypto.createHmac("sha256", secret).update(payloadB64).digest());

export function mintRunToken(p: Payload): string {
  const payloadB64 = b64urlJson(p);
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyRunToken(token: string): Payload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);

  // timingSafeEqual needs equal length buffers
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  let payload: Payload;
  try {
    const json = Buffer.from(
      payloadB64.replaceAll("-", "+").replaceAll("_", "/"),
      "base64"
    ).toString("utf8");
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  if (!payload?.nonce || !payload?.mode || !payload?.exp) return null;
  if (payload.mode !== "easy" && payload.mode !== "medium" && payload.mode !== "random")
    return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number") return null;
  if (payload.exp <= now) return null;

  return payload;
}