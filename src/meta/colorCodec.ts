import type { Color } from "../engine/types";
import { SIZE } from "../engine/engine";

// Universal grid code (v1): 25 literal R/G/B chars, prefixed "v1:".
// Human-readable + copyable + perfect for share links and debug.
// Future v2 (base64 of 2-bit values) can be added without breaking v1.

const N = SIZE * SIZE;

const COLOR_TO_CHAR: Record<Color, string> = { red: "R", green: "G", blue: "B" };
const CHAR_TO_COLOR: Record<string, Color> = { R: "red", G: "green", B: "blue" };

export function encodeGrid(grid: Color[]): string {
  return "v1:" + grid.map((c) => COLOR_TO_CHAR[c]).join("");
}

export function decodeGrid(code: string): Color[] | null {
  const raw = code.startsWith("v1:") ? code.slice(3) : code;
  if (raw.length !== N) return null;
  const out: Color[] = [];
  for (const ch of raw) {
    const color = CHAR_TO_COLOR[ch];
    if (!color) return null;
    out.push(color);
  }
  return out;
}
