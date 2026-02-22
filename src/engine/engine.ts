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

/**
 * Old scramble: keeps as utility.
 * NOTE: this always scrambles from "red".
 */
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

/**
 * Legacy mapping. Keep exported if used elsewhere,
 * but in F3.5 we'll compute real PAR via solver.
 */
export function parForScrambleMoves(scrambleMoves: number) {
  return 2 * scrambleMoves;
}

// ---------------- F3.5: REAL PAR (minimum moves) via Z3 linear solver ----------------

// Color ↔ Z3
function colorToZ3(c: Color): 0 | 1 | 2 {
  return c === "red" ? 0 : c === "green" ? 1 : 2;
}

// Z3 ops
function mod3(n: number): 0 | 1 | 2 {
  const v = ((n % 3) + 3) % 3;
  return (v === 0 ? 0 : v === 1 ? 1 : 2) as 0 | 1 | 2;
}
function add3(a: number, b: number) {
  return mod3(a + b);
}
function sub3(a: number, b: number) {
  return mod3(a - b);
}
function mul3(a: number, b: number) {
  return mod3(a * b);
}
function inv3(a: number) {
  const v = mod3(a);
  // in Z3: inv(1)=1, inv(2)=2 because 2*2=4≡1
  if (v === 0) throw new Error("No inverse for 0 in Z3");
  return v === 1 ? 1 : 2;
}

export type MinSolution = {
  par: number; // min sum of clicks
  target: Color; // best uniform target color
  x: number[]; // length 25, entries 0/1/2 (times clicked each cell)
  support: number; // number of non-zero entries
};

const N = SIZE * SIZE;

let MOVE_MATRIX_A: number[][] | null = null;

/**
 * A is NxN where A[rowCell][colMove] = 1 if clicking colMove affects rowCell.
 * Your move affects ONLY the 8 neighbors (not the clicked cell).
 */
function buildMoveMatrix(): number[][] {
  const A: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => 0));

  for (let move = 0; move < N; move++) {
    const affected = neighborIndices(move);
    for (const cell of affected) {
      A[cell][move] = 1;
    }
  }
  return A;
}

function getMoveMatrix(): number[][] {
  if (!MOVE_MATRIX_A) MOVE_MATRIX_A = buildMoveMatrix();
  return MOVE_MATRIX_A;
}

/**
 * Solve Ax=b over Z3, return:
 * - one particular solution x0
 * - nullspace basis vectors (each length N), so all solutions are x = x0 + sum(ci * basis[i])
 *
 * Returns null if inconsistent (should be rare but possible).
 */
function solveLinearSystemZ3(
  Ain: number[][],
  bin: number[]
): { x0: number[]; basis: number[][] } | null {
  // Make augmented matrix [A | b]
  const m = Ain.length;
  const n = Ain[0].length;

  const M: number[][] = Array.from({ length: m }, (_, r) => {
    const row = Array.from({ length: n + 1 }, () => 0);
    for (let c = 0; c < n; c++) row[c] = mod3(Ain[r][c]);
    row[n] = mod3(bin[r]);
    return row;
  });

  // Gaussian elimination to RREF-ish
  let row = 0;
  const pivotCols: number[] = [];

  for (let col = 0; col < n && row < m; col++) {
    // find pivot row with non-zero in this col
    let pivot = -1;
    for (let r = row; r < m; r++) {
      if (M[r][col] !== 0) {
        pivot = r;
        break;
      }
    }
    if (pivot === -1) continue;

    // swap
    if (pivot !== row) {
      const tmp = M[pivot];
      M[pivot] = M[row];
      M[row] = tmp;
    }

    // normalize pivot row to make pivot = 1
    const pv = M[row][col];
    const inv = inv3(pv);
    for (let c = col; c <= n; c++) M[row][c] = mul3(M[row][c], inv);

    // eliminate other rows
    for (let r = 0; r < m; r++) {
      if (r === row) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) {
        M[r][c] = sub3(M[r][c], mul3(factor, M[row][c]));
      }
    }

    pivotCols.push(col);
    row++;
  }

  // Check inconsistency: [0..0 | 1 or 2]
  for (let r = 0; r < m; r++) {
    let allZero = true;
    for (let c = 0; c < n; c++) {
      if (M[r][c] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero && M[r][n] !== 0) return null;
  }

  // Build one solution with free vars = 0
  const x0 = Array.from({ length: n }, () => 0);
  for (let r = 0; r < pivotCols.length; r++) {
    const pc = pivotCols[r];
    x0[pc] = mod3(M[r][n]);
  }

  // Free columns = those not in pivotCols
  const pivotSet = new Set(pivotCols);
  const freeCols: number[] = [];
  for (let c = 0; c < n; c++) if (!pivotSet.has(c)) freeCols.push(c);

  // For each free variable, construct a nullspace basis vector
  const basis: number[][] = [];
  for (const fc of freeCols) {
    const v = Array.from({ length: n }, () => 0);
    v[fc] = 1;

    // For each pivot row, pivot variable depends on free vars with minus signs
    for (let r = 0; r < pivotCols.length; r++) {
      const pc = pivotCols[r];
      const coeff = M[r][fc];
      if (coeff !== 0) v[pc] = sub3(v[pc], coeff);
    }

    basis.push(v);
  }

  return { x0, basis };
}

function weightSum(x: number[]) {
  let s = 0;
  let support = 0;
  for (const v of x) {
    const t = mod3(v);
    if (t !== 0) support++;
    s += t;
  }
  return { sum: s, support };
}

function addVecZ3(a: number[], b: number[]) {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) out[i] = add3(a[i], b[i]);
  return out;
}

function scaleVecZ3(v: number[], k: number) {
  const kk = mod3(k);
  if (kk === 0) return new Array<number>(v.length).fill(0);
  const out = new Array<number>(v.length);
  for (let i = 0; i < v.length; i++) out[i] = mul3(v[i], kk);
  return out;
}

/**
 * Enumerate basis combos (Z3 coefficients) to find minimal weight solution.
 * Returns best x.
 */
function minimizeWeight(
  x0: number[],
  basis: number[][]
): { x: number[]; sum: number; support: number } {
  const k = basis.length;

  // if k is 0, only x0 exists
  let bestX = x0;
  let best = weightSum(bestX);

  if (k === 0) return { x: bestX, sum: best.sum, support: best.support };

  // Full enumeration if small; otherwise random-ish sampling
  const maxFull = 12; // 3^12 = 531,441
  if (k <= maxFull) {
    const coeffs = new Array<number>(k).fill(0);

    const total = Math.pow(3, k);
    for (let t = 0; t < total; t++) {
      let x = x0;
      for (let i = 0; i < k; i++) {
        const c = coeffs[i];
        if (c !== 0) x = addVecZ3(x, scaleVecZ3(basis[i], c));
      }

      const w = weightSum(x);
      if (w.sum < best.sum || (w.sum === best.sum && w.support > best.support)) {
        // tie-break: same clicks -> prefer more spread solution
        bestX = x;
        best = w;
      }

      // increment coeffs base-3
      for (let i = 0; i < k; i++) {
        coeffs[i]++;
        if (coeffs[i] < 3) break;
        coeffs[i] = 0;
      }
    }

    return { x: bestX, sum: best.sum, support: best.support };
  }

  // Large nullspace: sample
  const tries = 5000;
  for (let t = 0; t < tries; t++) {
    let x = x0;
    for (let i = 0; i < k; i++) {
      const c = Math.floor(Math.random() * 3); // 0,1,2
      if (c !== 0) x = addVecZ3(x, scaleVecZ3(basis[i], c));
    }
    const w = weightSum(x);
    if (w.sum < best.sum || (w.sum === best.sum && w.support > best.support)) {
      bestX = x;
      best = w;
    }
  }

  return { x: bestX, sum: best.sum, support: best.support };
}

/**
 * Compute minimum PAR to reach ANY uniform color (red/green/blue) from `grid`.
 * Returns also one minimal solution vector x and which target was best.
 */
export function minParSolutionToAnySolved(grid: Color[]): MinSolution {
  const A = getMoveMatrix();
  const g = grid.map(colorToZ3); // 0/1/2

  let best: MinSolution | null = null;

  const targets: Color[] = ["red", "green", "blue"];
  for (const target of targets) {
    const t = colorToZ3(target);

    // b = target - grid (mod 3)
    const b = g.map((gi) => sub3(t, gi));

    const sol = solveLinearSystemZ3(A, b);
    if (!sol) continue;

    const min = minimizeWeight(sol.x0, sol.basis);

    const candidate: MinSolution = {
      par: min.sum,
      target,
      x: min.x.map((v) => mod3(v)),
      support: min.support,
    };

    if (!best) {
      best = candidate;
    } else {
      if (candidate.par < best.par) best = candidate;
      else if (candidate.par === best.par && candidate.support > best.support) best = candidate;
    }
  }

  if (!best) {
    return { par: 0, target: "red", x: new Array(N).fill(0), support: 0 };
  }

  return best;
}

/**
 * Convenience: only the number
 */
export function minParToAnySolved(grid: Color[]) {
  return minParSolutionToAnySolved(grid).par;
}

// ---------------- F3.5: Generation helpers with constraints ----------------

export type GeneratedPuzzle = { grid: Color[]; par: number; target: Color };

export function randomTargetColor(): Color {
  const r = Math.floor(Math.random() * 3);
  return r === 0 ? "red" : r === 1 ? "green" : "blue";
}

function applyMoveTimes(grid: Color[], index: number, times: number): Color[] {
  let out = grid;
  const t = ((times % 3) + 3) % 3;
  for (let k = 0; k < t; k++) out = applyMove(out, index);
  return out;
}

/**
 * Build a grid guaranteed solvable by `solutionVector` to reach `target`:
 * start from solved(target) and apply the solution presses -> initial grid.
 */
export function gridFromSolution(target: Color, solutionVector: number[]): Color[] {
  let grid = solvedGrid(target);

  for (let i = 0; i < N; i++) {
    const x = solutionVector[i] ?? 0;

    // IMPORTANT:
    // We want `solutionVector` to be the ACTUAL solution the user should play.
    // So we must generate the puzzle by applying the inverse moves: -x (mod 3).
    // In Z3, -1 ≡ 2, -2 ≡ 1.
    const inv = mod3(3 - mod3(x)); // 0->0, 1->2, 2->1

    if (inv) grid = applyMoveTimes(grid, i, inv);
  }

  return grid;
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function sampleDistinctIndices(n: number, k: number): number[] {
  const pool = Array.from({ length: n }, (_, i) => i);
  shuffleInPlace(pool);
  return pool.slice(0, k);
}

/**
 * Create vector with exactly `k` distinct cells clicked once (value=1).
 * This enforces "3 different pixels" for easy.
 */
function vectorKDistinctOnes(k: number): number[] {
  const v = new Array<number>(N).fill(0);
  const idx = sampleDistinctIndices(N, k);
  for (const i of idx) v[i] = 1;
  return v;
}

/**
 * Generate an EASY puzzle where:
 * - the REAL minimal PAR is exactly 3
 * - and the minimal solution uses >= 3 distinct cells
 */
export function generateEasyRealPar3Distinct(): GeneratedPuzzle {
  for (let attempt = 0; attempt < 400; attempt++) {
    const target = randomTargetColor();
    const planted = vectorKDistinctOnes(3);
    const grid = gridFromSolution(target, planted);

    const best = minParSolutionToAnySolved(grid);

    if (best.par === 3 && best.support >= 3) {
      return { grid, par: best.par, target: best.target };
    }
  }

  // Fallback: still return something reasonable
  const target = randomTargetColor();
  const planted = vectorKDistinctOnes(3);
  const grid = gridFromSolution(target, planted);
  const best = minParSolutionToAnySolved(grid);
  return { grid, par: best.par, target: best.target };
}

/**
 * Medium: plant 4..6 distinct ones for variety; compute real PAR once.
 */
export function generateMediumPlanted(parHint: number = 6): GeneratedPuzzle {
  const target = randomTargetColor();
  const planted = vectorKDistinctOnes(Math.max(4, Math.min(6, parHint)));
  const grid = gridFromSolution(target, planted);
  const best = minParSolutionToAnySolved(grid);
  return { grid, par: best.par, target: best.target };
}

/**
 * Random: scramble from solved(target) and compute real PAR.
 */
export function generateRandomRealPar(): GeneratedPuzzle {
  const target = randomTargetColor();

  let grid = solvedGrid(target);
  const moves = 5 + Math.floor(Math.random() * 26); // 5..30
  for (let i = 0; i < moves; i++) {
    const index = Math.floor(Math.random() * N);
    grid = applyMove(grid, index);
  }

  const best = minParSolutionToAnySolved(grid);
  return { grid, par: best.par, target: best.target };
}