// api/_lib/dailyGen.ts
// Server-safe daily generator (NO imports from /src).
// Deterministic per-day via seeded RNG + planted moves around a target color.

export type Color = "red" | "green" | "blue";

export const SIZE = 5;

function utcDailyId(d: Date = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
// Daily progressive number (#0001..#9999)
// Epoch day = day #0001 (UTC). Change only if you want to reset numbering.
const DAILY_EPOCH_UTC = "2026-02-25"; // #0001

function utcMidnightMsFromId(id: string) {
  // id = "YYYY-MM-DD"
  const [y, m, d] = id.split("-").map((n) => Number(n));
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function diffDaysUTC(fromId: string, toId: string) {
  const a = utcMidnightMsFromId(fromId);
  const b = utcMidnightMsFromId(toId);
  return Math.floor((b - a) / 86400000);
}

function dailyNumberFromId(id: string) {
  // #0001 for epoch day, #0002 next day, ...
  return diffDaysUTC(DAILY_EPOCH_UTC, id) + 1;
}

export function formatDailyNumber(n: number) {
  // 0001..9999
  const safe = Math.max(0, Math.min(9999, Math.floor(n)));
  return String(safe).padStart(4, "0");
}
// Small, deterministic RNG (mulberry32) seeded from string
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSeededRng(seedStr: string) {
  const seed = xmur3(seedStr)();
  const rnd = mulberry32(seed);
  return {
    next: () => rnd(),
    int: (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min,
  };
}

function nextColor(c: Color): Color {
  return c === "red" ? "green" : c === "green" ? "blue" : "red";
}

// Your rule: click changes the 8 surrounding tiles (NOT the clicked tile)
function neighbors8(idx: number) {
  const x = idx % SIZE;
  const y = Math.floor(idx / SIZE);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
      out.push(ny * SIZE + nx);
    }
  }
  return out;
}

function applyMove(grid: Color[], idx: number) {
  const g = grid.slice();
  const ns = neighbors8(idx);
  for (const j of ns) g[j] = nextColor(g[j]);
  return g;
}

function solvedGrid(color: Color): Color[] {
  return new Array(SIZE * SIZE).fill(color);
}

// Plant k moves from solved(target) → scramble grid deterministically.
// par returned = plantedMoves (good enough for daily; real min-par can be added later)
function generatePlantedParInRange(
  parMin: number,
  parMax: number,
  seed: string
): { dailyId: string; seed: string; par: number; grid: Color[] } {
  const dailyId = utcDailyId();
  const rng = makeSeededRng(seed);

  const target: Color = (["red", "green", "blue"] as const)[rng.int(0, 2)];
  const par = rng.int(parMin, parMax);

  let grid = solvedGrid(target);

  // choose par distinct-ish indices (allow repeats but low chance)
  const used = new Set<number>();
  for (let i = 0; i < par; i++) {
    let idx = rng.int(0, SIZE * SIZE - 1);
    // try a few times to avoid repeats (not required, just nicer)
    for (let t = 0; t < 8 && used.has(idx); t++) idx = rng.int(0, SIZE * SIZE - 1);
    used.add(idx);
    grid = applyMove(grid, idx);
  }

  return { dailyId, seed, par, grid };
}

export function generateDailyToday() {
  const dailyId = utcDailyId();
  const dailyNum = dailyNumberFromId(dailyId);
  const seed = `daily:${dailyId}`;

  // match your current range
  const g = generatePlantedParInRange(8, 19, seed);

  return {
    dailyId: g.dailyId,
    dailyNum,
    dailyNumStr: formatDailyNumber(dailyNum), // "0001".."9999" (comodo per UI)
    seed: g.seed,
    par: g.par,
    grid: g.grid,
  };
}