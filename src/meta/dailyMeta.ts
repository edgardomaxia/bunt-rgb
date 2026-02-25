// src/meta/dailyMeta.ts
export const DAILY_EPOCH_UTC = "2026-02-25"; // today = #0001 (UTC)

function parseUtcYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map((n) => Number(n));
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function utcDailyId(d: Date = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dailyNumberFromId(dailyId: string) {
  const epochMs = parseUtcYmd(DAILY_EPOCH_UTC);
  const idMs = parseUtcYmd(dailyId);
  const diffDays = Math.floor((idMs - epochMs) / 86400000);
  return diffDays + 1; // epoch day = 1
}

export function formatDailyNumber(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

export function nextDailyUtcMs(now: Date = new Date()) {
  // next 00:00 UTC
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return Date.UTC(y, m, d + 1, 0, 0, 0, 0);
}

export function formatCountdown(msLeft: number) {
  const clamped = Math.max(0, msLeft);
  const totalSeconds = Math.floor(clamped / 1000);
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}