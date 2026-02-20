import type { Color, PuzzleKind } from "./types";

export const SIZE = 5;

export const nextColor = (c: Color): Color =>
  c === "red" ? "green" : c === "green" ? "blue" : "red";

export function indexToRowCol(index: number) {
  return { r: Math.floor(index / SIZE), c: index % SIZE };
}

export function rowColToIndex(r: number, c: number) {
  return r * SIZE + c;
}

export function inBounds(r: number, c: number) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function neighborIndices(index: number) {
  const { r, c } = indexToRowCol(index);

  const deltas = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ] as const;

  const out: number[] = [];
  for (const [dr, dc] of deltas) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) out.push(rowColToIndex(nr, nc));
  }
  return out;
}

export function solvedGrid(color: Color = "red"): Color[] {
  return Array.from({ length: SIZE * SIZE }, () => color);
}

export function applyMove(grid: Color[], index: number): Color[] {
  const copy = [...grid];
  const neighbors = neighborIndices(index);
  for (const ni of neighbors) copy[ni] = nextColor(copy[ni]);
  return copy;
}

export function scrambleFromSolved(moves: number): Color[] {
  let grid = solvedGrid("red");
  for (let i = 0; i < moves; i++) {
    const index = Math.floor(Math.random() * (SIZE * SIZE));
    grid = applyMove(grid, index);
  }
  return grid;
}

export function scrambleMovesFor(kind: PuzzleKind) {
  switch (kind) {
    case "solved":
      return 0;
    case "easy":
      return 1;
    case "medium":
      return 3;
    case "random":
    default:
      return 12;
  }
}

export function parForScrambleMoves(scrambleMoves: number) {
  return 2 * scrambleMoves;
}