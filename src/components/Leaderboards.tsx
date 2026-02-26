// src/components/Leaderboards.tsx
import React, { useEffect, useMemo, useState } from "react";

export type LastSolvedRun = {
  kind: "daily" | "practice";
  par: number;
  clicks: number;
  timeMs: number;
  efficiencyScore: number; // 0..10000
  iso: string; // ISO timestamp
};

type LocalEntry = LastSolvedRun;

type LocalStore = {
  daily: LocalEntry[]; // unica classifica daily
  practiceByPar: Record<string, LocalEntry[]>; // chiave = "1".."20"
};

type GlobalRow = {
  nickname: string | null;
  time_ms: number;
  clicks: number;
  par: number;
  efficiency_score: number;
  created_at: string;
};

type GlobalStore = {
  daily: GlobalRow[];
  practiceByPar: Record<string, GlobalRow[]>;
};

const STORAGE_KEY_V2 = "bunt_rgb_leaderboards_v2";
const LEADERBOARD_SIZE = 10;

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

function sortLocal(a: LocalEntry, b: LocalEntry) {
  // 1) score desc, 2) time asc, 3) clicks asc
  if (b.efficiencyScore !== a.efficiencyScore) return b.efficiencyScore - a.efficiencyScore;
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  return a.clicks - b.clicks;
}

function emptyLocal(): LocalStore {
  return { daily: [], practiceByPar: {} };
}

function loadLocal(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return emptyLocal();
    const parsed = JSON.parse(raw) as Partial<LocalStore>;

    const daily = Array.isArray(parsed.daily) ? (parsed.daily as LocalEntry[]) : [];
    const practiceByPar =
      parsed.practiceByPar && typeof parsed.practiceByPar === "object"
        ? (parsed.practiceByPar as Record<string, LocalEntry[]>)
        : {};

    return { daily, practiceByPar };
  } catch {
    return emptyLocal();
  }
}

function saveLocal(v: LocalStore) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(v));
}

async function fetchGlobalDaily(limit: number): Promise<GlobalRow[]> {
  const res = await fetch(`/api/leaderboard?kind=daily&limit=${limit}`);
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = (await res.json()) as { items?: GlobalRow[] };
  return Array.isArray(data.items) ? data.items : [];
}

async function fetchGlobalPractice(par: number, limit: number): Promise<GlobalRow[]> {
  const res = await fetch(`/api/leaderboard?kind=practice&par=${par}&limit=${limit}`);
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = (await res.json()) as { items?: GlobalRow[] };
  return Array.isArray(data.items) ? data.items : [];
}

export default function Leaderboards(props: {
  visible: boolean;
  lastSolvedRun: LastSolvedRun | null;
  practicePar: number;
  onPracticeParChange: (p: number) => void;

  // NEW
  defaultView?: "global" | "local";
  lockView?: "global" | "local"; // se "local" -> Global disabilitato e sempre su Local
}) {
  const { visible, lastSolvedRun, practicePar, onPracticeParChange, defaultView, lockView } = props;

  const [view, setView] = useState<"global" | "local">(lockView ?? defaultView ?? "local");

  const [local, setLocal] = useState<LocalStore>(() =>
    typeof window === "undefined" ? emptyLocal() : loadLocal()
  );

  const [global, setGlobal] = useState<GlobalStore>(() => ({
    daily: [],
    practiceByPar: {},
  }));

  const [globalStatus, setGlobalStatus] = useState<"idle" | "loading" | "ready" | "unavailable">(
    "idle"
  );

  // NEW: lock view (e.g. force Local while Global is empty / not deployed)
  useEffect(() => {
    if (!lockView) return;
    setView(lockView);
  }, [lockView]);

 // 1) SAVE LOCAL on solved run (Daily + Practice-by-PAR)
useEffect(() => {
  if (!lastSolvedRun) return;
  if (typeof window === "undefined") return;

  // Guard: evita salvataggi “fantasma” (es. grid già solved al boot / restore)
  if (lastSolvedRun.clicks <= 0) return;
  if (lastSolvedRun.timeMs <= 0) return;

    // If just solved a practice run, auto-select that PAR everywhere
    if (lastSolvedRun.kind === "practice") {
      const p = clamp(Math.floor(lastSolvedRun.par), 1, 20);
      onPracticeParChange(p);
    }

    setLocal((prev) => {
      const next: LocalStore = {
        daily: prev.daily.slice(),
        practiceByPar: { ...(prev.practiceByPar || {}) },
      };

      if (lastSolvedRun.kind === "daily") {
        next.daily.push(lastSolvedRun);
        next.daily.sort(sortLocal);
        next.daily = next.daily.slice(0, LEADERBOARD_SIZE);
      } else {
        const p = String(clamp(Math.floor(lastSolvedRun.par), 1, 20));
        const arr = Array.isArray(next.practiceByPar[p]) ? next.practiceByPar[p].slice() : [];
        arr.push(lastSolvedRun);
        arr.sort(sortLocal);
        next.practiceByPar[p] = arr.slice(0, LEADERBOARD_SIZE);
      }

      saveLocal(next);
      return next;
    });
  }, [lastSolvedRun, onPracticeParChange]);

  // 2) LOAD GLOBAL when view=global (non rompe se API non pronta)
  useEffect(() => {
    if (view !== "global") return;
    if (typeof window === "undefined") return;

    let alive = true;

    (async () => {
      try {
        setGlobalStatus("loading");

        const [daily, practice] = await Promise.all([
          fetchGlobalDaily(LEADERBOARD_SIZE),
          fetchGlobalPractice(practicePar, LEADERBOARD_SIZE),
        ]);

        if (!alive) return;

        setGlobal({
          daily,
          practiceByPar: { [String(practicePar)]: practice },
        });

        setGlobalStatus("ready");
      } catch {
        if (!alive) return;
        setGlobalStatus("unavailable");
      }
    })();

    return () => {
      alive = false;
    };
  }, [view, practicePar]);

  const cardStyle: React.CSSProperties = useMemo(
    () => ({
      width: "min(560px, 92vw)",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.10)",
      background: "rgba(255,255,255,.04)",
      padding: 14,
    }),
    []
  );

  const btnStyle: React.CSSProperties = useMemo(
    () => ({
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,.18)",
      background: "rgba(255,255,255,.06)",
      color: "#fff",
      cursor: "pointer",
      fontSize: 12,
    }),
    []
  );

  function clearLocal() {
    const e = emptyLocal();
    setLocal(e);
    saveLocal(e);
  }

  function renderLocalDaily() {
    const rows = local.daily;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 16, letterSpacing: 0.2 }}>Local — Daily</div>
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
                    <td style={{ padding: "8px 6px" }}>{r.efficiencyScore}</td>
                    <td style={{ padding: "8px 6px" }}>{formatTimeMs(r.timeMs)}</td>
                    <td style={{ padding: "8px 6px" }}>{r.clicks}</td>
                    <td style={{ padding: "8px 6px" }}>{r.par}</td>
                    <td style={{ padding: "8px 6px", opacity: 0.8 }}>{new Date(r.iso).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderLocalPractice() {
    const key = String(practicePar);
    const rows = Array.isArray(local.practiceByPar[key]) ? local.practiceByPar[key] : [];

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 16, letterSpacing: 0.2 }}>Local — Practice (PAR {practicePar})</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Top {LEADERBOARD_SIZE}</div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Filter PAR</div>
          <select
            value={practicePar}
            onChange={(e) => {
              const p = Number(e.target.value);
              onPracticeParChange(p);
            }}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
            }}
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p} style={{ color: "#000" }}>
                {p}
              </option>
            ))}
          </select>
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
                    <td style={{ padding: "8px 6px" }}>{r.efficiencyScore}</td>
                    <td style={{ padding: "8px 6px" }}>{formatTimeMs(r.timeMs)}</td>
                    <td style={{ padding: "8px 6px" }}>{r.clicks}</td>
                    <td style={{ padding: "8px 6px" }}>{r.par}</td>
                    <td style={{ padding: "8px 6px", opacity: 0.8 }}>{new Date(r.iso).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderGlobal() {
    if (globalStatus === "loading") {
      return <div style={{ opacity: 0.7, fontSize: 12 }}>Loading global scores...</div>;
    }
    if (globalStatus === "unavailable") {
      return (
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Global leaderboard unavailable (API not deployed yet for Daily/Practice).
        </div>
      );
    }

    const practiceRows = global.practiceByPar[String(practicePar)] ?? [];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 16, letterSpacing: 0.2 }}>Global — Daily</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Top {LEADERBOARD_SIZE}</div>
          </div>

          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ opacity: 0.7, textAlign: "left" }}>
                  <th style={{ padding: "8px 6px" }}>Rank</th>
                  <th style={{ padding: "8px 6px" }}>Player</th>
                  <th style={{ padding: "8px 6px" }}>Efficiency</th>
                  <th style={{ padding: "8px 6px" }}>Time</th>
                  <th style={{ padding: "8px 6px" }}>Clicks</th>
                  <th style={{ padding: "8px 6px" }}>PAR</th>
                  <th style={{ padding: "8px 6px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {global.daily.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "10px 6px", opacity: 0.7 }}>
                      No entries yet.
                    </td>
                  </tr>
                ) : (
                  global.daily.map((r, i) => (
                    <tr key={`${r.created_at}-${i}`} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                      <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                      <td style={{ padding: "8px 6px" }}>{r.nickname ?? "anon"}</td>
                      <td style={{ padding: "8px 6px" }}>{r.efficiency_score}</td>
                      <td style={{ padding: "8px 6px" }}>{formatTimeMs(r.time_ms)}</td>
                      <td style={{ padding: "8px 6px" }}>{r.clicks}</td>
                      <td style={{ padding: "8px 6px" }}>{r.par}</td>
                      <td style={{ padding: "8px 6px", opacity: 0.8 }}>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 16, letterSpacing: 0.2 }}>Global — Practice (PAR {practicePar})</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Top {LEADERBOARD_SIZE}</div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Filter PAR</div>
            <select
              value={practicePar}
              onChange={(e) => {
                const p = Number(e.target.value);
                onPracticeParChange(p);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
              }}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p} style={{ color: "#000" }}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ opacity: 0.7, textAlign: "left" }}>
                  <th style={{ padding: "8px 6px" }}>Rank</th>
                  <th style={{ padding: "8px 6px" }}>Player</th>
                  <th style={{ padding: "8px 6px" }}>Efficiency</th>
                  <th style={{ padding: "8px 6px" }}>Time</th>
                  <th style={{ padding: "8px 6px" }}>Clicks</th>
                  <th style={{ padding: "8px 6px" }}>PAR</th>
                  <th style={{ padding: "8px 6px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {practiceRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "10px 6px", opacity: 0.7 }}>
                      No entries yet.
                    </td>
                  </tr>
                ) : (
                  practiceRows.map((r, i) => (
                    <tr key={`${r.created_at}-${i}`} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                      <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                      <td style={{ padding: "8px 6px" }}>{r.nickname ?? "anon"}</td>
                      <td style={{ padding: "8px 6px" }}>{r.efficiency_score}</td>
                      <td style={{ padding: "8px 6px" }}>{formatTimeMs(r.time_ms)}</td>
                      <td style={{ padding: "8px 6px" }}>{r.clicks}</td>
                      <td style={{ padding: "8px 6px" }}>{r.par}</td>
                      <td style={{ padding: "8px 6px", opacity: 0.8 }}>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ opacity: 0.55, fontSize: 12, marginTop: 10, textAlign: "center" }}>
          Stored globally on server (nickname optional).
        </div>
      </div>
    );
  }

  // Component sempre montato per salvare anche in practice.
  // UI nascosta se visible=false.
  if (!visible) return <div style={{ display: "none" }} aria-hidden="true" />;

  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: "0 0 6px 0", fontSize: 20, letterSpacing: 0.4, opacity: 0.9 }}>
          Leaderboards
        </h2>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              if (lockView === "local") return;
              setView("global");
            }}
            disabled={lockView === "local"}
            style={{
              ...btnStyle,
              background: view === "global" ? "#fff" : "rgba(255,255,255,.06)",
              color: view === "global" ? "#000" : "#fff",
              opacity: lockView === "local" ? 0.35 : 1,
              cursor: lockView === "local" ? "not-allowed" : "pointer",
            }}
          >
            Global
          </button>

          <button
            onClick={() => setView("local")}
            style={{
              ...btnStyle,
              background: view === "local" ? "#fff" : "rgba(255,255,255,.06)",
              color: view === "local" ? "#000" : "#fff",
              opacity: lockView === "local" ? 0.85 : 1,
              cursor: lockView === "local" ? "default" : "pointer",
            }}
          >
            Local
          </button>
        </div>
      </div>

      {view === "local" ? (
        <>
          {renderLocalPractice()}
          {renderLocalDaily()}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <button onClick={clearLocal} style={btnStyle}>
              Clear local scores
            </button>
          </div>

          <div style={{ opacity: 0.55, fontSize: 12, marginTop: 10, textAlign: "center" }}>
            Stored locally in this browser only.
          </div>
        </>
      ) : (
        renderGlobal()
      )}
    </div>
  );
}