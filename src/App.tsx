import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Color, PuzzleKind } from "./engine/types";
import {
  SIZE,
  applyMove,
  scrambleFromSolved,
  scrambleMovesFor,
  solvedGrid,
  parForScrambleMoves,
} from "./engine/engine";
import { APP_VERSION, APP_STATUS } from "./meta/appMeta";
import { VERSION_HISTORY } from "./meta/versions";

const LEADERBOARD_SIZE = 10;
const STORAGE_KEY = "bunt_rgb_leaderboards_v1";
const RUN_STATE_KEY = "bunt_rgb_run_state_v1";

type Mode = "normal" | "practice";

type LeaderboardEntry = {
  kind: Exclude<PuzzleKind, "solved">;
  score: number; // efficiency 0..10000
  timeMs: number;
  clicks: number;
  par: number;
  iso: string; // ISO timestamp
};

type Leaderboards = Record<Exclude<PuzzleKind, "solved">, LeaderboardEntry[]>;

type RunState = {
  puzzleKind: PuzzleKind;
  par: number;
  grid: Color[];
  clicks: number;
  elapsedMs: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTimeMs(ms: number) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

function emptyLeaderboards(): Leaderboards {
  return { easy: [], medium: [], random: [] };
}

function loadLeaderboards(): Leaderboards {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLeaderboards();
    const parsed = JSON.parse(raw) as Partial<Leaderboards>;
    return {
      easy: Array.isArray(parsed.easy) ? parsed.easy : [],
      medium: Array.isArray(parsed.medium) ? parsed.medium : [],
      random: Array.isArray(parsed.random) ? parsed.random : [],
    };
  } catch {
    return emptyLeaderboards();
  }
}

function saveLeaderboards(lb: Leaderboards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lb));
}

function loadRunState(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RunState>;
    if (!parsed.puzzleKind || !parsed.par || !parsed.grid) return null;
    if (!Array.isArray(parsed.grid) || parsed.grid.length !== SIZE * SIZE) return null;

    return {
      puzzleKind: parsed.puzzleKind,
      par: Number(parsed.par),
      grid: parsed.grid as Color[],
      clicks: Number(parsed.clicks ?? 0),
      elapsedMs: Number(parsed.elapsedMs ?? 0),
    };
  } catch {
    return null;
  }
}

function saveRunState(state: RunState) {
  localStorage.setItem(RUN_STATE_KEY, JSON.stringify(state));
}

function clearRunState() {
  localStorage.removeItem(RUN_STATE_KEY);
}

function sortEntries(a: LeaderboardEntry, b: LeaderboardEntry) {
  // 1) score desc, 2) time asc, 3) clicks asc
  if (b.score !== a.score) return b.score - a.score;
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  return a.clicks - b.clicks;
}
const TILE_COLORS: Record<Color, string> = {
  red: "#f31b1b",
  green: "#00d500",
  blue: "#0033ff",
};

export default function App() {
  const initialRun = useMemo(() => {
    if (typeof window === "undefined") return null;
    return loadRunState();
  }, []);

  const [mode, setMode] = useState<Mode>("normal");
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const [puzzleKind, setPuzzleKind] = useState<PuzzleKind>(() => initialRun?.puzzleKind ?? "random");

  const [par, setPar] = useState<number>(() => {
    if (initialRun) return initialRun.par;
    return parForScrambleMoves(scrambleMovesFor("random"));
  });

  const [grid, setGrid] = useState<Color[]>(() => {
    if (initialRun) return initialRun.grid;
    return scrambleFromSolved(scrambleMovesFor("random"));
  });

  const [clicks, setClicks] = useState(() => initialRun?.clicks ?? 0);
  const [elapsedMs, setElapsedMs] = useState(() => initialRun?.elapsedMs ?? 0);

  const [leaderboards, setLeaderboards] = useState<Leaderboards>(() =>
    typeof window === "undefined" ? emptyLeaderboards() : loadLeaderboards()
  );

  // Timer refs
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  // Avoid saving multiple times for the same solved run
  const savedThisRunRef = useRef(false);

  const isSolved = useMemo(() => {
    const first = grid[0];
    return grid.every((c) => c === first);
  }, [grid]);

  const efficiencyScore = useMemo(() => {
    if (par === 0) return 10000;
    if (clicks === 0) return 0;
    const efficiency = par / clicks;
    return Math.round(10000 * clamp(efficiency, 0, 1));
  }, [par, clicks]);

  const btnStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    cursor: "pointer",
  };

  const practiceBtnStyle: React.CSSProperties = {
    padding: "14px 18px",
    borderRadius: 12,
    border: "3px solid rgba(255,255,255,.35)",
    background: "#000",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
    letterSpacing: 0.6,
    fontWeight: 700,
  };

  const cardStyle: React.CSSProperties = {
    width: "min(560px, 92vw)",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    padding: 14,
  };

  const resetBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: "#fff",
    color: "#000",
    border: "1px solid rgba(255,255,255,.35)",
  };

  const backBtnStyle: React.CSSProperties = {
    ...resetBtnStyle,
    background: "#fff",
    color: "#000",
  };

  const appShellStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 720,
  };

  function stopTimer() {
    runningRef.current = false;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  function tick() {
    if (!runningRef.current || startTimeRef.current == null) return;
    const now = performance.now();
    setElapsedMs(now - startTimeRef.current);
    rafIdRef.current = requestAnimationFrame(tick);
  }

  function startTimerIfNeeded() {
    if (runningRef.current) return;
    if (isSolved) return;
    runningRef.current = true;
    startTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(tick);
  }

  // Persist run-state ONLY in normal mode AND NOT for Random (random must regenerate on refresh)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mode !== "normal" || puzzleKind === "random") {
      clearRunState();
      return;
    }

    saveRunState({
      puzzleKind,
      par,
      grid,
      clicks,
      elapsedMs,
    });
  }, [mode, puzzleKind, par, grid, clicks, elapsedMs]);

  // Stop timer on solve
  useEffect(() => {
    if (isSolved) stopTimer();
  }, [isSolved]);

  // Save to local leaderboard once per solved run (normal mode only)
  useEffect(() => {
    if (mode !== "normal") return;
    if (!isSolved) return;
    if (savedThisRunRef.current) return;
    if (puzzleKind === "solved") return;

    savedThisRunRef.current = true;

    const kind = puzzleKind as Exclude<PuzzleKind, "solved">;

    const entry: LeaderboardEntry = {
      kind,
      score: efficiencyScore,
      timeMs: Math.round(elapsedMs),
      clicks,
      par,
      iso: new Date().toISOString(),
    };

    setLeaderboards((prev) => {
      const next: Leaderboards = {
        easy: [...prev.easy],
        medium: [...prev.medium],
        random: [...prev.random],
      };

      next[kind].push(entry);
      next[kind].sort(sortEntries);
      next[kind] = next[kind].slice(0, LEADERBOARD_SIZE);

      saveLeaderboards(next);
      return next;
    });
  }, [mode, isSolved, puzzleKind, efficiencyScore, elapsedMs, clicks, par]);

  // ESC closes modals + lock body scroll when any modal is open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsVersionOpen(false);
        setIsFeedbackOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);

    const anyModalOpen = isVersionOpen || isFeedbackOpen;
    const prevOverflow = document.body.style.overflow;
    if (anyModalOpen) document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isVersionOpen, isFeedbackOpen]);

  function loadPuzzle(kind: PuzzleKind) {
    const scrambleMoves =
      kind === "random"
        ? 5 + Math.floor(Math.random() * 26) // 5..30
        : scrambleMovesFor(kind);

    const nextPar = parForScrambleMoves(scrambleMoves);

    setPuzzleKind(kind);
    setPar(nextPar);
    setGrid(kind === "solved" ? solvedGrid("red") : scrambleFromSolved(scrambleMoves));

    setClicks(0);
    setElapsedMs(0);

    stopTimer();
    startTimeRef.current = null;
    savedThisRunRef.current = false;

    // ensure Random never persists across refresh
    if (kind === "random") clearRunState();
  }

  function clearLeaderboards() {
    const empty = emptyLeaderboards();
    setLeaderboards(empty);
    saveLeaderboards(empty);
  }

  function renderTable(kind: Exclude<PuzzleKind, "solved">, title: string) {
    const rows = leaderboards[kind];

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 16, letterSpacing: 0.2 }}>{title}</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Top {LEADERBOARD_SIZE}</div>
        </div>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ opacity: 0.7, textAlign: "left" }}>
                <th style={{ padding: "8px 6px" }}>Rank</th>
                <th style={{ padding: "8px 6px" }}>Efficiency</th>
                <th style={{ padding: "8px 6px" }}>Time</th>
                <th style={{ padding: "8px 6px" }}>Clicks</th>
                <th style={{ padding: "8px 6px" }}>PAR</th>
                <th style={{ padding: "8px 6px" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "10px 6px", opacity: 0.7 }}>
                    No entries yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.iso}-${i}`} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 6px" }}>{r.score}</td>
                    <td style={{ padding: "8px 6px" }}>{formatTimeMs(r.timeMs)}</td>
                    <td style={{ padding: "8px 6px" }}>{r.clicks}</td>
                    <td style={{ padding: "8px 6px" }}>{r.par}</td>
                    <td style={{ padding: "8px 6px", opacity: 0.8 }}>
                      {new Date(r.iso).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const isPractice = mode === "practice";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: isPractice ? "#1e1b20" : "#000",
        color: "#fff",
        fontFamily: "system-ui",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      {/* HEADER LEFT: version + status */}
      <div
        style={{
          position: "absolute",
          top: 22,
          left: 30,
          lineHeight: 1.25,
          zIndex: 5,
          textAlign: "left",
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsVersionOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setIsVersionOpen(true);
          }}
          style={{
            fontSize: 11,
            opacity: 0.85,
            cursor: "pointer",
            textDecoration: "underline",
            userSelect: "none",
          }}
          title="Open version history"
        >
          v{APP_VERSION}
        </div>
        <div style={{ fontSize: 10, opacity: 0.55 }}>{APP_STATUS}</div>
      </div>

      {/* HEADER RIGHT: feedback button */}
      <div style={{ position: "absolute", top: 22, right: 30, zIndex: 5 }}>
        <button
          onClick={() => setIsFeedbackOpen(true)}
          style={{
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.15)",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 12,
            fontSize: 11,
            cursor: "pointer",
            lineHeight: 1.15,
          }}
          title="Send anonymous feedback"
        >
          Anonymous
          <br />
          Feedback
        </button>
      </div>

      {/* VERSION MODAL */}
      {isVersionOpen ? (
        <div
          onClick={() => setIsVersionOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 92vw)",
              maxHeight: "min(760px, 86vh)",
              overflow: "auto",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(15,15,15,.96)",
              boxShadow: "0 20px 80px rgba(0,0,0,.6)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 18, letterSpacing: 0.2 }}>Version history</div>
              <button
                onClick={() => setIsVersionOpen(false)}
                style={{
                  border: "1px solid rgba(255,255,255,.14)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
              Click outside or press ESC to close.
            </div>

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {VERSION_HISTORY.map((v) => (
                <div
                  key={v.version}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.04)",
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 14, letterSpacing: 0.2 }}>v{v.version}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {v.deployedAtIso === "TBD" ? "online: TBD" : `online: ${v.deployedAtIso}`}
                    </div>
                  </div>

                  <ul style={{ margin: "10px 0 0 18px", padding: 0, opacity: 0.9, fontSize: 13 }}>
                    {v.notes.map((n, i) => (
                      <li key={i} style={{ margin: "6px 0" }}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* FEEDBACK MODAL (Tally iframe) */}
      {isFeedbackOpen ? (
        <div
          onClick={() => setIsFeedbackOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 95vw)",
              height: "min(800px, 90vh)",
              borderRadius: 16,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 20px 80px rgba(0,0,0,.6)",
            }}
          >
            <iframe
              src="https://tally.so/r/xXpB15"
              width="100%"
              height="100%"
              frameBorder={0}
              style={{ border: "none" }}
              title="BUNT RGB Anonymous Feedback"
            />
          </div>
        </div>
      ) : null}

      {/* GAME */}
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ textAlign: "center", width: "100%" }}>
          {isPractice ? (
            <div style={{ letterSpacing: 2, fontSize: 14, opacity: 0.85, marginTop: 0 }}>
              PRACTICE
            </div>
          ) : null}

          <h1 style={{ margin: "70px 0 0 0", fontSize: 66, letterSpacing: 1 }}>BUNT RGB</h1>

          <div style={{ opacity: 0.85, marginTop: 0, fontSize: 18 }}>
            Make all tiles the same color
          </div>

          {isPractice ? null : (
            <div style={{ opacity: 0.6, marginTop: 8, fontSize: 12 }}>
              (Timer starts on first click)
            </div>
          )}

          {isPractice ? null : (
            <div
              style={{
                opacity: 0.9,
                marginTop: 14,
                display: "flex",
                gap: 18,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Time</div>
                <div style={{ fontSize: 20 }}>{formatTimeMs(elapsedMs)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Clicks</div>
                <div style={{ fontSize: 20 }}>{clicks}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>PAR</div>
                <div style={{ fontSize: 20 }}>{par}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Efficiency</div>
                <div style={{ fontSize: 20 }}>{efficiencyScore}</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, opacity: 0.9 }}>
            {isSolved ? "✅ Solved" : ""}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 60px)`,
            gap: "6px",
            filter: isSolved ? "drop-shadow(0 0 10px rgba(255,255,255,.25))" : "none",
          }}
        >
          {grid.map((color, index) => (
            <button
              key={index}
              onClick={() => {
                if (isSolved) return;
                if (!isPractice) startTimerIfNeeded();
                setGrid((prev) => applyMove(prev, index));
                setClicks((c) => c + 1);
              }}
              style={{
                width: 60,
                height: 60,
                background: TILE_COLORS[color],
                borderRadius: 8,
                border: "none",
                padding: 0,
                cursor: isSolved ? "default" : "pointer",
                outline: "1px solid rgba(255,255,255,.08)",
              }}
              aria-label={`cell-${index}`}
            />
          ))}
        </div>

        {/* BUTTONS */}
        {isPractice ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => loadPuzzle("easy")} style={btnStyle}>
              Easy (PAR 2)
            </button>

            <button onClick={() => loadPuzzle("medium")} style={btnStyle}>
              Medium (PAR 6)
            </button>

            <button onClick={() => loadPuzzle("random")} style={btnStyle}>
              Random
            </button>

            <button
              onClick={() => {
                setMode("normal");
                loadPuzzle("random");
              }}
              style={backBtnStyle}
            >
              Back
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={() => loadPuzzle("easy")} style={btnStyle}>
                Easy (PAR 2)
              </button>

              <button onClick={() => loadPuzzle("medium")} style={btnStyle}>
                Medium (PAR 6)
              </button>

              <button onClick={() => loadPuzzle("random")} style={btnStyle}>
                Random (PAR 10–60)
              </button>

              <button onClick={() => loadPuzzle("random")} style={resetBtnStyle}>
                Reset
              </button>
            </div>

            <button
              onClick={() => {
                setMode("practice");
                loadPuzzle("random");
              }}
              style={practiceBtnStyle}
            >
              PRACTICE MODE
            </button>
          </div>
        )}

        {/* LEADERBOARDS (normal only) */}
        {isPractice ? null : (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: 20, letterSpacing: 0.4, opacity: 0.9 }}>
              Leaderboards
            </h2>

            {renderTable("easy", "Local Leaderboard — Easy")}
            {renderTable("medium", "Local Leaderboard — Medium")}
            {renderTable("random", "Local Leaderboard — Random")}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <button onClick={clearLeaderboards} style={btnStyle}>
                Clear local scores
              </button>
            </div>

            <div style={{ opacity: 0.55, fontSize: 12, marginTop: 10, textAlign: "center" }}>
              Stored locally in this browser only.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}