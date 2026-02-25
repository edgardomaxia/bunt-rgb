import React, { useEffect, useMemo, useRef, useState } from "react";

export type LeaderboardKind = "daily" | "practice";

export type LocalLeaderboardEntry = {
  score: number; // 0..10000
  timeMs: number;
  clicks: number;
  par: number; // daily has its own par; practice uses selected PAR
  iso: string; // ISO timestamp
};

export type LastSolvedRun = {
  kind: LeaderboardKind;
  score: number;
  timeMs: number;
  clicks: number;
  par: number;
  iso: string;
};

type GlobalScoreRow = {
  mode: LeaderboardKind; // "daily" | "practice"
  nickname: string | null;
  time_ms: number;
  clicks: number;
  par: number;
  efficiency_score: number;
  created_at: string;
  app_version: string | null;
};

type Props = {
  // game state
  mode: "normal" | "practice";
  practicePar: number;

  // passing “one-shot” solved run from App
  lastSolvedRun: LastSolvedRun | null;
  onConsumeSolvedRun?: () => void;

  // UI style helpers (optional, keeps App clean)
  cardStyle?: React.CSSProperties;
  btnStyle?: React.CSSProperties;
};

const LEADERBOARD_SIZE = 10;

// NEW storage key (v2) for new structure
const STORAGE_KEY_V2 = "bunt_rgb_leaderboards_v2";

// legacy key (v1) used by old Easy/Medium/Random structure
const STORAGE_KEY_V1 = "bunt_rgb_leaderboards_v1";

type LocalStoreV2 = {
  daily: LocalLeaderboardEntry[];
  practiceByPar: Record<string, LocalLeaderboardEntry[]>; // key = "1".."20"
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

function sortEntries(a: LocalLeaderboardEntry, b: LocalLeaderboardEntry) {
  // 1) score desc, 2) time asc, 3) clicks asc
  if (b.score !== a.score) return b.score - a.score;
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  return a.clicks - b.clicks;
}

function emptyStore(): LocalStoreV2 {
  return { daily: [], practiceByPar: {} };
}

function loadStoreV2(): LocalStoreV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<LocalStoreV2>;

    const daily = Array.isArray(parsed.daily) ? parsed.daily : [];
    const pbp =
      parsed.practiceByPar && typeof parsed.practiceByPar === "object"
        ? (parsed.practiceByPar as Record<string, LocalLeaderboardEntry[]>)
        : {};

    return { daily, practiceByPar: pbp };
  } catch {
    return emptyStore();
  }
}

function saveStoreV2(store: LocalStoreV2) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(store));
}

function migrateFromV1IfNeeded() {
  // one-time migration: if v2 exists, do nothing.
  // if only v1 exists, migrate ONLY "daily" array (ignore easy/medium/random).
  try {
    const v2 = localStorage.getItem(STORAGE_KEY_V2);
    if (v2) return;

    const v1raw = localStorage.getItem(STORAGE_KEY_V1);
    if (!v1raw) return;

    const v1 = JSON.parse(v1raw) as any;
    const daily = Array.isArray(v1?.daily) ? (v1.daily as LocalLeaderboardEntry[]) : [];

    const next: LocalStoreV2 = { daily, practiceByPar: {} };
    saveStoreV2(next);
  } catch {
    // ignore migration failures
  }
}

async function fetchGlobal(
  kind: LeaderboardKind,
  limit: number,
  practicePar?: number
): Promise<GlobalScoreRow[]> {
  // ready for backend evolution:
  // daily: /api/leaderboard?mode=daily&limit=10
  // practice: /api/leaderboard?mode=practice&par=5&limit=10
  const qp = new URLSearchParams();
  qp.set("mode", kind);
  qp.set("limit", String(limit));
  if (kind === "practice") qp.set("par", String(practicePar ?? 5));

  const res = await fetch(`/api/leaderboard?${qp.toString()}`);
  if (!res.ok) throw new Error(`http_${res.status}`);

  const data = (await res.json()) as { mode: string; items: GlobalScoreRow[] };
  return Array.isArray(data?.items) ? data.items : [];
}

export default function Leaderboards(props: Props) {
  const cardStyle: React.CSSProperties =
    props.cardStyle ?? {
      width: "min(560px, 92vw)",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.10)",
      background: "rgba(255,255,255,.04)",
      padding: 14,
    };

  const btnStyle: React.CSSProperties =
    props.btnStyle ?? {
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,.18)",
      background: "rgba(255,255,255,.06)",
      color: "#fff",
      cursor: "pointer",
    };

  const isPracticeMode = props.mode === "practice";

  // default requirements:
  // - default view: Global
  // - default board: Daily in normal mode, Practice in practice mode
  const [view, setView] = useState<"global" | "local">("global");
  const [board, setBoard] = useState<LeaderboardKind>(isPracticeMode ? "practice" : "daily");

  const [practiceParUi, setPracticeParUi] = useState<number>(() =>
    clamp(Math.floor(props.practicePar || 5), 1, 20)
  );

  // local store (v2)
  const [store, setStore] = useState<LocalStoreV2>(() => emptyStore());

  // global state
  const [globalStatus, setGlobalStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [globalDaily, setGlobalDaily] = useState<GlobalScoreRow[]>([]);
  const [globalPractice, setGlobalPractice] = useState<GlobalScoreRow[]>([]);

  // avoid double save for same solved run
  const lastSavedIsoRef = useRef<string | null>(null);

  // one-time migrate + load local store
  useEffect(() => {
    if (typeof window === "undefined") return;
    migrateFromV1IfNeeded();
    setStore(loadStoreV2());
  }, []);

  // keep practice selector in sync with App (if user changes slider)
  useEffect(() => {
    setPracticeParUi(clamp(Math.floor(props.practicePar || 5), 1, 20));
  }, [props.practicePar]);

  // if user enters practice mode, default tab becomes Practice
  useEffect(() => {
    if (isPracticeMode) setBoard("practice");
    else setBoard("daily");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPracticeMode]);

  // consume solved runs from App -> save locally (Daily or Practice-by-PAR)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!props.lastSolvedRun) return;

    const run = props.lastSolvedRun;

    // guard: only once per iso
    if (lastSavedIsoRef.current === run.iso) return;
    lastSavedIsoRef.current = run.iso;

    setStore((prev) => {
      const next: LocalStoreV2 = {
        daily: prev.daily.slice(),
        practiceByPar: { ...prev.practiceByPar },
      };

      const entry: LocalLeaderboardEntry = {
        score: run.score,
        timeMs: run.timeMs,
        clicks: run.clicks,
        par: run.par,
        iso: run.iso,
      };

      if (run.kind === "daily") {
        next.daily.push(entry);
        next.daily.sort(sortEntries);
        next.daily = next.daily.slice(0, LEADERBOARD_SIZE);
      } else {
        const k = String(clamp(Math.floor(run.par), 1, 20));
        const bucket = Array.isArray(next.practiceByPar[k]) ? next.practiceByPar[k].slice() : [];
        bucket.push(entry);
        bucket.sort(sortEntries);
        next.practiceByPar[k] = bucket.slice(0, LEADERBOARD_SIZE);
      }

      saveStoreV2(next);
      return next;
    });

    props.onConsumeSolvedRun?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lastSolvedRun]);

  // fetch global when view/board/par changes (but only if view is global)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (view !== "global") return;

    let cancelled = false;

    (async () => {
      try {
        setGlobalStatus("loading");

        if (board === "daily") {
          const items = await fetchGlobal("daily", LEADERBOARD_SIZE);
          if (cancelled) return;
          setGlobalDaily(items);
        } else {
          const items = await fetchGlobal("practice", LEADERBOARD_SIZE, practiceParUi);
          if (cancelled) return;
          setGlobalPractice(items);
        }

        if (!cancelled) setGlobalStatus("ready");
      } catch {
        if (!cancelled) setGlobalStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view, board, practiceParUi]);

  function clearLocalScores() {
    const next = emptyStore();
    setStore(next);
    saveStoreV2(next);
  }

  const localRows = useMemo(() => {
    if (board === "daily") return store.daily;
    const k = String(clamp(Math.floor(practiceParUi), 1, 20));
    return store.practiceByPar[k] ?? [];
  }, [store, board, practiceParUi]);

  function renderLocalTable(title: string) {
    const rows = localRows;

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

  function renderGlobalTable(title: string, rows: GlobalScoreRow[]) {
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
                <th style={{ padding: "8px 6px" }}>Player</th>
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
                  <td colSpan={7} style={{ padding: "10px 6px", opacity: 0.7 }}>
                    No entries yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.created_at}-${i}`} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 6px" }}>{r.nickname ?? "anon"}</td>
                    <td style={{ padding: "8px 6px" }}>{r.efficiency_score}</td>
                    <td style={{ padding: "8px 6px" }}>{formatTimeMs(r.time_ms)}</td>
                    <td style={{ padding: "8px 6px" }}>{r.clicks}</td>
                    <td style={{ padding: "8px 6px" }}>{r.par}</td>
                    <td style={{ padding: "8px 6px", opacity: 0.8 }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ opacity: 0.55, fontSize: 12, marginTop: 10, textAlign: "center" }}>
          Global submit is currently disabled (read-only).
        </div>
      </div>
    );
  }

  const headerBtn = (active: boolean): React.CSSProperties => ({
    ...btnStyle,
    padding: "8px 10px",
    fontSize: 12,
    background: active ? "#fff" : "rgba(255,255,255,.06)",
    color: active ? "#000" : "#fff",
  });

  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: "0 0 6px 0", fontSize: 20, letterSpacing: 0.4, opacity: 0.9 }}>
          Leaderboards
        </h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => setView("global")} style={headerBtn(view === "global")}>
            Global
          </button>
          <button onClick={() => setView("local")} style={headerBtn(view === "local")}>
            Local
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setBoard("daily")} style={headerBtn(board === "daily")}>
          Daily
        </button>
        <button onClick={() => setBoard("practice")} style={headerBtn(board === "practice")}>
          Practice
        </button>

        {board === "practice" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 6 }}>
            <div style={{ opacity: 0.7, fontSize: 12 }}>PAR</div>
            <select
              value={practiceParUi}
              onChange={(e) => setPracticeParUi(clamp(Number(e.target.value), 1, 20))}
              style={{
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.18)",
                color: "#fff",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 12,
                outline: "none",
              }}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} style={{ color: "#000" }}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {view === "local" ? (
        <>
          {board === "daily"
            ? renderLocalTable("Local Leaderboard — Daily")
            : renderLocalTable(`Local Leaderboard — Practice (PAR ${practiceParUi})`)}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <button onClick={clearLocalScores} style={btnStyle}>
              Clear local scores
            </button>
          </div>

          <div style={{ opacity: 0.55, fontSize: 12, marginTop: 10, textAlign: "center" }}>
            Stored locally in this browser only.
          </div>
        </>
      ) : (
        <>
          <div style={{ opacity: 0.65, fontSize: 12, marginTop: -4 }}>
            {globalStatus === "loading" ? "Loading global scores..." : null}
            {globalStatus === "error" ? "Global leaderboard unavailable." : null}
          </div>

          {board === "daily"
            ? renderGlobalTable("Global Leaderboard — Daily", globalDaily)
            : renderGlobalTable(`Global Leaderboard — Practice (PAR ${practiceParUi})`, globalPractice)}

          <div style={{ opacity: 0.55, fontSize: 12, marginTop: 10, textAlign: "center" }}>
            Stored globally on server (nickname optional).
          </div>
        </>
      )}
    </div>
  );
}