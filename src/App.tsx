// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Color } from "./engine/types";
import Leaderboards, { type LastSolvedRun } from "./components/Leaderboards";
import {
  SIZE,
  applyMove,
  generateRandomRealPar,
  gridFromSolution,
  randomTargetColor,
  minParSolutionToAnySolved,
} from "./engine/engine";
import { APP_VERSION, APP_STATUS } from "./meta/appMeta";
import { VERSION_HISTORY } from "./meta/versions";
import { BUILD_INFO } from "./meta/buildInfo";
import { utcDailyId, dailyNumberFromId, nextDailyUtcMs, formatCountdown } from "./meta/dailyMeta";

const RUN_STATE_KEY = "bunt_rgb_run_state_v1";
const DAILY_STATE_KEY = "bunt_rgb_daily_state_v1";
const GLOBAL_OPT_KEY = "bunt_rgb_global_opt_in_v1"; // "yes" | "no"
const NICKNAME_KEY = "bunt_rgb_nickname_v1"; // string

type Mode = "normal" | "practice";
type GameKind = "daily" | "practice";

type RunState = {
  puzzleKind: GameKind;
  par: number;
  grid: Color[];
  initialGrid: Color[];
  clicks: number;
  elapsedMs: number;
};

type DailyState = {
  dailyId: string; // e.g. "2026-02-25" (UTC)
  par: number;
  grid: Color[];
  initialGrid: Color[];
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

function loadRunState(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RunState>;
    if (!parsed.puzzleKind || parsed.par == null || !parsed.grid) return null;
    if (!Array.isArray(parsed.grid) || parsed.grid.length !== SIZE * SIZE) return null;

    const initialGrid =
      Array.isArray((parsed as any).initialGrid) && (parsed as any).initialGrid.length === SIZE * SIZE
        ? ((parsed as any).initialGrid as Color[])
        : (parsed.grid as Color[]);

    const kind = parsed.puzzleKind === "practice" ? "practice" : "daily";

    return {
      puzzleKind: kind,
      par: Number(parsed.par),
      grid: parsed.grid as Color[],
      initialGrid,
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

function loadDailyState(): DailyState | null {
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyState>;
    if (!parsed.dailyId) return null;
    if (parsed.par == null) return null;
    if (!Array.isArray(parsed.grid) || parsed.grid.length !== SIZE * SIZE) return null;

    const initialGrid =
      Array.isArray((parsed as any).initialGrid) && (parsed as any).initialGrid.length === SIZE * SIZE
        ? ((parsed as any).initialGrid as Color[])
        : (parsed.grid as Color[]);

    return {
      dailyId: String(parsed.dailyId),
      par: Number(parsed.par),
      grid: parsed.grid as Color[],
      initialGrid,
    };
  } catch {
    return null;
  }
}

function saveDailyState(state: DailyState) {
  localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(state));
}

function loadGlobalOpt(): "yes" | "no" | null {
  try {
    const v = localStorage.getItem(GLOBAL_OPT_KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

function saveGlobalOpt(v: "yes" | "no") {
  try {
    localStorage.setItem(GLOBAL_OPT_KEY, v);
  } catch {}
}

function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveNickname(v: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, v);
  } catch {}
}

const TILE_COLORS: Record<Color, string> = {
  red: "#f31b1b",
  green: "#00d500",
  blue: "#0033ff",
};

function formatOnlineIso(iso: string) {
  const fmt = (d: Date) => {
    const date = d.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const off = -d.getTimezoneOffset() / 60;
    const sign = off >= 0 ? "+" : "-";
    const hh = String(Math.abs(off)).padStart(2, "0");
    return `online: ${date}, ${time} (GMT${sign}${hh})`;
  };

  if (iso === "TBD") return "online: TBD";

  if (iso === "AUTO") {
    const d = new Date(BUILD_INFO.builtAtIso);
    if (BUILD_INFO.builtAtIso === "local") return "online: local";
    if (Number.isNaN(d.getTime())) return "online: local";
    return fmt(d);
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `online: ${iso}`;
  return fmt(d);
}

function AppInner() {
  const initialRun = useMemo(() => {
    if (typeof window === "undefined") return null;
    return loadRunState();
  }, []);

  const bootstrap = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (initialRun) return null;
    return generateRandomRealPar();
  }, [initialRun]);

  const [mode, setMode] = useState<Mode>("normal");
  const [practicePar, setPracticePar] = useState<number>(5);

  // DAILY LABEL + COUNTDOWN STATE
  const [dailyId, setDailyId] = useState<string>(() => utcDailyId());
  const [dailyNum, setDailyNum] = useState<number>(() => dailyNumberFromId(utcDailyId()));
  const [nextDailyIn, setNextDailyIn] = useState<string>(() =>
    formatCountdown(nextDailyUtcMs(new Date()) - Date.now())
  );

  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [isGlobalOptOpen, setIsGlobalOptOpen] = useState(false);
  const [globalOpt, setGlobalOpt] = useState<"yes" | "no" | null>(() =>
    typeof window === "undefined" ? null : loadGlobalOpt()
  );
  const [nickname, setNickname] = useState<string>(() =>
    typeof window === "undefined" ? "" : loadNickname()
  );

  const [puzzleKind, setPuzzleKind] = useState<GameKind>(() =>
    (initialRun?.puzzleKind as GameKind | undefined) ?? "daily"
  );

  const [par, setPar] = useState<number>(() => {
    if (initialRun) return initialRun.par;
    return bootstrap?.par ?? 0;
  });

  const [grid, setGrid] = useState<Color[]>(() => {
    if (initialRun) return initialRun.grid;
    return bootstrap?.grid ?? generateRandomRealPar().grid;
  });

  const [initialGrid, setInitialGrid] = useState<Color[]>(() => {
    if (initialRun) return (initialRun.initialGrid ?? initialRun.grid) as Color[];
    return (bootstrap?.grid ?? generateRandomRealPar().grid).slice();
  });

  const [clicks, setClicks] = useState(() => initialRun?.clicks ?? 0);
  const [elapsedMs, setElapsedMs] = useState(() => initialRun?.elapsedMs ?? 0);
  const [lastSolvedRun, setLastSolvedRun] = useState<LastSolvedRun | null>(null);

  // Timer refs
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  // Avoid duplicates for the same solved run
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

  const topLinkStyle: React.CSSProperties = {
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.15)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 11,
    cursor: "pointer",
    lineHeight: 1.15,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    width: 95,
    height: 44,
    boxSizing: "border-box",
  };

  const practiceBtnStyle: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 12,
    border: "3px solid rgba(255,255,255,.35)",
    background: "#000",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
    letterSpacing: 0.6,
    fontWeight: 700,
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

  const modalCloseStyle: React.CSSProperties = {
    position: "absolute",
    top: 12,
    right: 14,
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
    opacity: 0.75,
    padding: 4,
  };

  function getShareText() {
    return `Can you solve this?\nhttps://bunt-rgb.com/demo/`;
  }

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

  // Auto-load Daily on first mount (normal mode)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mode !== "normal") return;

    if (initialRun) return;

    void loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DAILY: update countdown every second + detect day rollover (UTC)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tick2 = () => {
      const now = Date.now();
      const msLeft = nextDailyUtcMs(new Date()) - now;
      setNextDailyIn(formatCountdown(msLeft));

      const idNow = utcDailyId();
      if (idNow !== dailyId) {
        setDailyId(idNow);
        setDailyNum(dailyNumberFromId(idNow));

        if (mode === "normal" && puzzleKind === "daily") {
          void loadDaily();
        }
      }
    };

    tick2();
    const t = window.setInterval(tick2, 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyId, mode, puzzleKind]);

  // Persist run-state ONLY for Daily (normal mode)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mode !== "normal" || puzzleKind !== "daily") {
      clearRunState();
      return;
    }

    saveRunState({
      puzzleKind,
      par,
      grid,
      initialGrid,
      clicks,
      elapsedMs,
    });
  }, [mode, puzzleKind, par, grid, initialGrid, clicks, elapsedMs]);

// Stop timer on solve + emit lastSolvedRun (Daily + Practice)
useEffect(() => {
  if (!isSolved) return;

  stopTimer();

  // evita doppio emit per lo stesso solve
  if (savedThisRunRef.current) return;
  savedThisRunRef.current = true;

  const run: LastSolvedRun = {
    kind: mode === "practice" ? "practice" : "daily",
    par,
    clicks,
    timeMs: Math.round(elapsedMs),
    efficiencyScore,
    iso: new Date().toISOString(),
  };

  setLastSolvedRun(run);
}, [isSolved, mode, par, clicks, elapsedMs, efficiencyScore]);


  // Open global opt-in modal ONLY after solving Daily (and only once ever)
  useEffect(() => {
    if (mode !== "normal") return;
    if (puzzleKind !== "daily") return;
    if (!isSolved) return;
    if (savedThisRunRef.current !== true) return;

    const opt = globalOpt ?? (typeof window === "undefined" ? null : loadGlobalOpt());
    if (opt) return;

    setIsGlobalOptOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, puzzleKind, isSolved, globalOpt]);

  // ESC closes modals + lock body scroll when any modal is open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsVersionOpen(false);
        setIsFeedbackOpen(false);
        setIsShareOpen(false);
        setIsHelpOpen(false);
        setIsGlobalOptOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    const anyModalOpen = isVersionOpen || isFeedbackOpen || isShareOpen || isHelpOpen || isGlobalOptOpen;
    const prevOverflow = document.body.style.overflow;
    if (anyModalOpen) document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isVersionOpen, isFeedbackOpen, isShareOpen, isHelpOpen, isGlobalOptOpen]);

  async function loadDaily() {
    const todayId = utcDailyId();
    const cached = loadDailyState();

    try {
      const res = await fetch("/api/daily", { cache: "no-store" });
      const data = await res.json();

      if (!data?.ok) throw new Error("daily api not ok");

      const apiDailyId = String(data.dailyId ?? todayId);
      const apiPar = Number(data.par) || 0;
      const apiGrid = (data.grid as Color[] | undefined)?.slice?.();

      if (!apiGrid || apiGrid.length !== SIZE * SIZE) {
        throw new Error("daily api grid invalid");
      }

      if (cached && cached.dailyId === apiDailyId) {
        const merged: DailyState = {
          dailyId: apiDailyId,
          par: apiPar,
          grid: cached.grid.slice(),
          initialGrid:
            cached.initialGrid?.length === SIZE * SIZE ? cached.initialGrid.slice() : apiGrid.slice(),
        };
        saveDailyState(merged);

        setMode("normal");
        setPuzzleKind("daily");
        setPar(merged.par);
        setInitialGrid(merged.initialGrid.slice());
        setGrid(merged.grid.slice());
      } else {
        const fresh: DailyState = {
          dailyId: apiDailyId,
          par: apiPar,
          grid: apiGrid.slice(),
          initialGrid: apiGrid.slice(),
        };
        saveDailyState(fresh);

        setMode("normal");
        setPuzzleKind("daily");
        setPar(fresh.par);
        setInitialGrid(fresh.initialGrid.slice());
        setGrid(fresh.grid.slice());
      }

      setClicks(0);
      setElapsedMs(0);
      stopTimer();
      startTimeRef.current = null;
      savedThisRunRef.current = false;

      return;
    } catch (e) {
      if (cached && cached.dailyId === todayId) {
        setMode("normal");
        setPuzzleKind("daily");
        setPar(cached.par);
        setInitialGrid(cached.initialGrid.slice());
        setGrid(cached.grid.slice());
        setClicks(0);
        setElapsedMs(0);

        stopTimer();
        startTimeRef.current = null;
        savedThisRunRef.current = false;

        return;
      }

      console.error("[daily] failed to load from /api/daily", e);
      setMode("normal");
      setPuzzleKind("daily");
      return;
    }
  }

  function loadPracticeWithPar(parTarget: number) {
    const safePar = clamp(Math.floor(parTarget), 1, 20);

    let bestGrid: Color[] | null = null;
    let bestPar = Infinity;

    for (let attempt = 0; attempt < 120; attempt++) {
      const target = randomTargetColor();

      const k = clamp(safePar, 1, 25);
      const vec = new Array<number>(SIZE * SIZE).fill(0);

      const pool = Array.from({ length: SIZE * SIZE }, (_, i) => i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let i = 0; i < k; i++) vec[pool[i]] = 1;

      const g = gridFromSolution(target, vec);
      const sol = minParSolutionToAnySolved(g);
      const realPar = sol.par;

      if (realPar === safePar) {
        bestGrid = g;
        bestPar = realPar;
        break;
      }

      if (Math.abs(realPar - safePar) < Math.abs(bestPar - safePar)) {
        bestGrid = g;
        bestPar = realPar;
      }
    }

    const nextGrid =
      bestGrid ?? gridFromSolution(randomTargetColor(), new Array(SIZE * SIZE).fill(0));

    setPuzzleKind("practice");
    setPar(safePar);
    setInitialGrid(nextGrid.slice());
    setGrid(nextGrid);
    setClicks(0);
    setElapsedMs(0);

    stopTimer();
    startTimeRef.current = null;
    savedThisRunRef.current = false;
  }

  function resetToInitial() {
    setGrid(initialGrid.slice());
    setClicks(0);
    setElapsedMs(0);

    stopTimer();
    startTimeRef.current = null;
    savedThisRunRef.current = false;
  }

  const isPractice = mode === "practice";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: isPractice ? "flex-start" : "center",
        alignItems: isPractice ? "flex-start" : "center",
        background: isPractice ? "#111111" : "#000",
        color: "#fff",
        fontFamily: "system-ui",
        padding: 6,
        paddingTop: isPractice ? 40 : 6,
        boxSizing: "border-box",
      }}
    >
      {isPractice ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            background: "rgba(255,255,255,.14)",
            borderBottom: "1px solid rgba(255,255,255,.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            letterSpacing: 2,
            fontSize: 12,
            fontWeight: 800,
            zIndex: 40,
            userSelect: "none",
          }}
        >
          PRACTICE
        </div>
      ) : null}

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
              position: "relative",
            }}
          >
            <button onClick={() => setIsVersionOpen(false)} style={modalCloseStyle} aria-label="Close">
              ×
            </button>

            <div style={{ fontSize: 18, letterSpacing: 0.2 }}>Version history</div>

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
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{formatOnlineIso(v.deployedAtIso)}</div>
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

      {/* SHARE MODAL */}
      {isShareOpen ? (
        <div
          onClick={() => setIsShareOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            zIndex: 58,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(15,15,15,.96)",
              boxShadow: "0 20px 80px rgba(0,0,0,.6)",
              padding: 16,
              position: "relative",
            }}
          >
            <button onClick={() => setIsShareOpen(false)} style={modalCloseStyle} aria-label="Close">
              ×
            </button>
            <div style={{ fontSize: 18, letterSpacing: 0.2 }}>Share</div>

            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 10, whiteSpace: "pre-wrap" }}>
              {getShareText()}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => {
                  const text = getShareText();
                  navigator.clipboard.writeText(text);
                  alert("Copied!");
                  setIsShareOpen(false);
                }}
                style={btnStyle}
              >
                Copy
              </button>

              <button
                onClick={() => {
                  const text = getShareText();
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                }}
                style={btnStyle}
              >
                WhatsApp
              </button>

              <button
                onClick={() => {
                  const text = getShareText();
                  window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                }}
                style={btnStyle}
              >
                Telegram
              </button>

              <button
                onClick={() => {
                  const text = getShareText();
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                }}
                style={btnStyle}
              >
                X
              </button>

              <button
                onClick={() => {
                  const text = getShareText();
                  window.location.href = `mailto:?subject=${encodeURIComponent("BUNT RGB challenge")}&body=${encodeURIComponent(text)}`;
                }}
                style={btnStyle}
              >
                Email
              </button>
            </div>

            <div style={{ opacity: 0.6, fontSize: 12, marginTop: 12 }}>
              Tip: click outside or press ESC to close.
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
              position: "relative",
            }}
          >
            <button onClick={() => setIsFeedbackOpen(false)} style={modalCloseStyle} aria-label="Close">
              ×
            </button>
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

      {/* HELP MODAL */}
      {isHelpOpen ? (
        <div
          onClick={() => setIsHelpOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            zIndex: 59,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 92vw)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(15,15,15,.96)",
              boxShadow: "0 20px 80px rgba(0,0,0,.6)",
              padding: 16,
              position: "relative",
            }}
          >
            <button onClick={() => setIsHelpOpen(false)} style={modalCloseStyle} aria-label="Close">
              ×
            </button>

            <div style={{ fontSize: 18, letterSpacing: 0.2 }}>How it works</div>

            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 10 }}>
              Click a tile: the 8 surrounding tiles change color.
            </div>
          </div>
        </div>
      ) : null}

      {/* GLOBAL SAVE OPT-IN MODAL */}
      {isGlobalOptOpen ? (
        <div
          onClick={() => setIsGlobalOptOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            zIndex: 61,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(15,15,15,.96)",
              boxShadow: "0 20px 80px rgba(0,0,0,.6)",
              padding: 16,
              position: "relative",
            }}
          >
            <button onClick={() => setIsGlobalOptOpen(false)} style={modalCloseStyle} aria-label="Close">
              ×
            </button>

            <div style={{ fontSize: 18, letterSpacing: 0.2 }}>Save score online?</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 10 }}>
              You’ll appear in the Global Leaderboard. Nickname is optional.
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Nickname (optional)</div>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. axiomizer"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  saveGlobalOpt("no");
                  setGlobalOpt("no");
                  setIsGlobalOptOpen(false);
                }}
                style={btnStyle}
              >
                No thanks
              </button>

              <button
                onClick={() => {
                  const nn = nickname.trim();
                  saveNickname(nn);
                  saveGlobalOpt("yes");
                  setGlobalOpt("yes");
                  setIsGlobalOptOpen(false);

                  // submit is disabled for now (read-only global)
                }}
                style={{ ...btnStyle, background: "#fff", color: "#000" }}
              >
                Save
              </button>
            </div>
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
          {/* TOP CENTER: version + status + links */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.75 }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsVersionOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setIsVersionOpen(true);
                }}
                style={{
                  cursor: "pointer",
                  textDecoration: "underline",
                  userSelect: "none",
                  opacity: 0.95,
                }}
                title="Open version history"
              >
                v{APP_VERSION}
              </div>

              <div style={{ opacity: 0.6 }}>•</div>

              <div style={{ opacity: 0.85 }}>{APP_STATUS}</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href="https://bunt-rgb.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={topLinkStyle}
                title="Official website"
              >
                Official
                <br />
                Website
              </a>

              <a
                href="https://www.youtube.com/@BuntRGB"
                target="_blank"
                rel="noopener noreferrer"
                style={topLinkStyle}
                title="Follow my devlog journey"
              >
                Follow my
                <br />
                Devlog
              </a>

              <button onClick={() => setIsFeedbackOpen(true)} style={topLinkStyle} title="Send anonymous feedback">
                Send
                <br />
                Feedback
              </button>
            </div>
          </div>

          <h1 style={{ margin: "3px 0 0 0", fontSize: 66, letterSpacing: 1 }}>BUNT RGB</h1>

          <div style={{ opacity: 0.8, marginTop: -10, fontSize: 27, letterSpacing: 2 }}>
            A DAILY PUZZLE GAME
          </div>

          <div style={{ opacity: 0.7, marginTop: -3, fontSize: 11, letterSpacing: 2 }}>
            DAILY SCRAMBLE #{String(dailyNum).padStart(4, "0")} • NEXT IN {nextDailyIn}
          </div>

          <div style={{ opacity: 0.85, marginTop: 12, fontSize: 18 }}>Make all tiles the same color</div>

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

          <div style={{ marginTop: 10, opacity: 0.9 }}>{isSolved ? "✅ Solved" : ""}</div>
        </div>

        <div style={{ position: "relative", display: "inline-block" } as React.CSSProperties}>
          {/* HELP BUTTON (outside, left) */}
          <button
            onClick={() => setIsHelpOpen(true)}
            aria-label="Help"
            title="Help"
            style={{
              position: "absolute",
              top: 6,
              left: -58,
              width: 32,
              height: 32,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.35)",
              background: "rgba(0,0,0,.55)",
              color: "#fff",
              fontSize: 18,
              fontWeight: 800,
              lineHeight: "32px",
              padding: 0,
              cursor: "pointer",
              textAlign: "center",
              zIndex: 199,
              display: "block",
            }}
          >
            {"?"}
          </button>

          {/* GRID */}
          <div
            style={
              {
                "--tile": "clamp(44px, 12vw, 60px)",
                "--gap": "clamp(4px, 1.6vw, 6px)",
                display: "grid",
                gridTemplateColumns: `repeat(${SIZE}, var(--tile))`,
                gap: "var(--gap)",
                filter: "none",
              } as React.CSSProperties
            }
          >
            {grid.map((color, index) => (
              <button
                key={index}
                onClick={() => {
                  if (isSolved) return;
                  startTimerIfNeeded();
                  setGrid((prev) => applyMove(prev, index));
                  setClicks((c) => c + 1);
                }}
                style={{
                  width: "var(--tile)",
                  height: "var(--tile)",
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
        </div>

        {/* BUTTONS */}
        {isPractice ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: "min(520px, 92vw)",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.04)",
                padding: 12,
              }}
            >
              <div style={{ marginTop: 10, textAlign: "center", fontSize: 16, fontWeight: 900, letterSpacing: 0.6 }}>
                PAR = {practicePar}
              </div>

              <div style={{ marginTop: 10 }}>
                <input
                  className="parSlider"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={practicePar}
                  onChange={(e) => setPracticePar(Number(e.target.value))}
                  aria-label="Practice difficulty (PAR)"
                  style={{
                    ["--track" as any]: `hsl(${Math.round(120 - ((practicePar - 1) / 19) * 120)} 100% 45%)`,
                  }}
                />

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    letterSpacing: 2,
                    fontWeight: 800,
                    opacity: 0.75,
                    userSelect: "none",
                  }}
                >
                  <div>EASY</div>
                  <div>HARD</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => loadPracticeWithPar(practicePar)} style={btnStyle}>
                  Generate
                </button>

                <button onClick={resetToInitial} style={resetBtnStyle}>
                  Reset
                </button>
              </div>

              <style>{`
                .parSlider{
                  width: 100%;
                  height: 14px;
                  border-radius: 999px;
                  outline: none;
                  cursor: pointer;
                  appearance: none;
                  -webkit-appearance: none;
                  background: var(--track, #00d500);
                  box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
                }

                .parSlider::-webkit-slider-thumb{
                  -webkit-appearance: none;
                  appearance: none;
                  width: 22px;
                  height: 22px;
                  border-radius: 999px;
                  background: #ffffff;
                  border: 2px solid rgba(0,0,0,.65);
                  box-shadow: 0 8px 18px rgba(0,0,0,.45);
                }

                .parSlider::-moz-range-thumb{
                  width: 22px;
                  height: 22px;
                  border-radius: 999px;
                  background: #ffffff;
                  border: 2px solid rgba(0,0,0,.65);
                  box-shadow: 0 8px 18px rgba(0,0,0,.45);
                }
              `}</style>
                    </div>

            {/* LEADERBOARDS (Practice) */}
            <div style={{ width: "min(560px, 92vw)", marginTop: 6 }}>
<Leaderboards
  visible={true}
  lastSolvedRun={lastSolvedRun}
  practicePar={practicePar}
  onPracticeParChange={setPracticePar}
  defaultView="local"
  lockView="local"
/>
            </div>

            <button
              onClick={() => {
                setMode("normal");
                void loadDaily();
              }}
              style={backBtnStyle}
            >
              Back
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={resetToInitial} style={resetBtnStyle}>
                Reset
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", width: "100%" }}>
              <button
                onClick={() => setIsShareOpen(true)}
                style={{
                  ...practiceBtnStyle,
                  fontSize: 14,
                  letterSpacing: 1.2,
                  fontWeight: 800,
                  padding: "12px 18px",
                  flex: 1,
                  maxWidth: 260,
                }}
              >
                SHARE
              </button>

              <button
                onClick={() => {
                  setMode("practice");
                  setPuzzleKind("practice");
                  loadPracticeWithPar(practicePar);
                }}
                style={{
                  ...practiceBtnStyle,
                  flex: 1,
                  maxWidth: 260,
                }}
              >
                PRACTICE MODE
              </button>
            </div>
          </div>
        )}



        {/* FOOTER BUILD INFO */}
        <div
          style={{
            width: "100%",
            textAlign: "center",
            fontSize: 10,
            opacity: 0.45,
            marginTop: 0,
            paddingBottom: 20,
          }}
        >
          {BUILD_INFO.vercelEnv} • {BUILD_INFO.gitBranch} •EM•{" "}
          {BUILD_INFO.gitSha === "local" ? "local" : BUILD_INFO.gitSha.slice(0, 7)} •{" "}
          {BUILD_INFO.builtAtIso === "local" ? "" : new Date(BUILD_INFO.builtAtIso).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; info: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, info: "" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, info: info.componentStack || "" });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            width: "100vw",
            background: "#000",
            color: "#fff",
            fontFamily: "system-ui",
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>App crashed (runtime error)</div>

          <div style={{ opacity: 0.85, marginBottom: 8 }}>{String(this.state.error)}</div>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              opacity: 0.75,
              fontSize: 12,
              lineHeight: 1.35,
              border: "1px solid rgba(255,255,255,.14)",
              borderRadius: 12,
              padding: 12,
              background: "rgba(255,255,255,.04)",
            }}
          >
            {this.state.info}
          </pre>

          <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
            Tip: apri anche la Console per vedere lo stack completo.
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}