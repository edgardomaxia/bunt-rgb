import type { Color } from "../engine/types";
import { SIZE } from "../engine/engine";
import { encodeGrid } from "../meta/colorCodec";
import { formatTimeMs } from "./format";

// Wordle-style shareable result: the scramble (as emoji grid) others can replay,
// plus your stats. Self-contained: practice links carry the grid in the URL hash,
// so a friend can open and play the exact same scramble with no backend.

const EMOJI: Record<Color, string> = { red: "🟥", green: "🟩", blue: "🟦" };

export function gridToEmoji(grid: Color[]): string {
  const rows: string[] = [];
  for (let r = 0; r < SIZE; r++) {
    let row = "";
    for (let c = 0; c < SIZE; c++) row += EMOJI[grid[r * SIZE + c]];
    rows.push(row);
  }
  return rows.join("\n");
}

export type ShareInput = {
  kind: "daily" | "practice";
  dailyNum: number | null;
  par: number;
  clicks: number;
  timeMs: number;
  scramble: Color[]; // initial grid (the puzzle to solve)
};

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

export function shareIdLabel(input: ShareInput): string {
  if (input.kind === "daily" && input.dailyNum != null) return `#${pad4(input.dailyNum)}`;
  return "Practice";
}

export function shareUrl(input: ShareInput): string {
  const origin =
    typeof window !== "undefined" && window.location ? window.location.origin : "https://bunt-rgb.com";
  if (input.kind === "daily" && input.dailyNum != null) {
    return `${origin}/?d=${pad4(input.dailyNum)}`;
  }
  // Practice: encode the scramble so the link is fully replayable without a server.
  return `${origin}/#g=${encodeGrid(input.scramble)}`;
}

export function buildShareText(input: ShareInput): string {
  const head = `BUNT RGB ${shareIdLabel(input)}`;
  const clickWord = input.clicks === 1 ? "click" : "clicks";
  const stats = `${input.clicks} ${clickWord} · PAR ${input.par} · ${formatTimeMs(input.timeMs)}`;
  const grid = gridToEmoji(input.scramble);
  const cta = `Can you solve this? ${shareUrl(input)}`;
  return `${head}\n${stats}\n${grid}\n${cta}`;
}
