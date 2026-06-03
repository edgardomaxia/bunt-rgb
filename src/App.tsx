import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Color } from "./engine/types";
import {
  SIZE,
  applyMove,
  generateRandomRealPar,
  gridFromSolution,
  randomTargetColor,
  minParSolutionToAnySolved,
} from "./engine/engine";
import { utcDailyId } from "./meta/dailyMeta";

import { BottomNav, type ScreenId } from "./components/layout/BottomNav";
import { VersionModal } from "./components/modals/VersionModal";
import { ShareModal } from "./components/modals/ShareModal";
import { FeedbackModal } from "./components/modals/FeedbackModal";
import { DonateModal } from "./components/modals/DonateModal";
import { HelpModal } from "./components/modals/HelpModal";
import { PastScramblesModal } from "./components/modals/PastScramblesModal";
import { GlobalOptModal } from "./components/modals/GlobalOptModal";
import { CustomComplexityModal } from "./components/modals/CustomComplexityModal";

import { DailyScreen } from "./screens/DailyScreen";
import { PracticeScreen } from "./screens/PracticeScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

import type { LastSolvedRun } from "./components/Leaderboards";
import { useTheme } from "./hooks/useTheme";
import { useTimer } from "./hooks/useTimer";
import { useDailyMeta } from "./hooks/useDailyMeta";
import {
  clearRunState,
  loadDailyState,
  loadGlobalOpt,
  loadNickname,
  loadRunState,
  saveDailyState,
  saveNickname,
  saveRunState,
  type GameKind,
} from "./lib/storage";
import { clamp } from "./lib/format";
import { fetchDaily } from "./lib/api";
import { decodeGrid } from "./meta/colorCodec";
import { buildShareText } from "./lib/share";
import { track, trackScreen } from "./lib/analytics";
import type { Difficulty } from "./components/game/DifficultyButtons";

const DIFFICULTY_TO_PAR: Record<Difficulty, number> = {
  easy: 3,
  medium: 8,
  hard: 15,
};

function pickDifficultyFromPar(par: number): Difficulty {
  if (par <= 5) return "easy";
  if (par <= 10) return "medium";
  return "hard";
}

function AppInner() {
  const { resolved, toggle, pref: themePref, setThemePref } = useTheme();

  const initialRun = useMemo(() => (typeof window === "undefined" ? null : loadRunState()), []);

  // Shared practice scramble carried in the URL hash (#g=<grid code>): fully
  // replayable challenge with no backend. Takes precedence over the daily boot.
  const sharedScramble = useMemo(() => {
    if (typeof window === "undefined") return null;
    const m = window.location.hash.match(/#g=(.+)$/);
    if (!m) return null;
    try {
      return decodeGrid(decodeURIComponent(m[1]));
    } catch {
      return null;
    }
  }, []);

  // PAR of the shared scramble, computed once (used to seed the practice run).
  const sharedPar = useMemo(
    () => (sharedScramble ? minParSolutionToAnySolved(sharedScramble).par : 0),
    [sharedScramble]
  );

  const bootstrap = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (initialRun || sharedScramble) return null;
    return generateRandomRealPar();
  }, [initialRun, sharedScramble]);

  const [activeScreen, setActiveScreen] = useState<ScreenId>(() =>
    sharedScramble ? "practice" : "daily"
  );

  const [puzzleKind, setPuzzleKind] = useState<GameKind>(() =>
    sharedScramble ? "practice" : ((initialRun?.puzzleKind as GameKind | undefined) ?? "daily")
  );
  const [par, setPar] = useState<number>(() => {
    if (sharedScramble) return sharedPar;
    if (initialRun) return initialRun.par;
    return bootstrap?.par ?? 0;
  });
  const [grid, setGrid] = useState<Color[]>(() => {
    if (sharedScramble) return sharedScramble.slice();
    if (initialRun) return initialRun.grid;
    return bootstrap?.grid ?? generateRandomRealPar().grid;
  });
  const [initialGrid, setInitialGrid] = useState<Color[]>(() => {
    if (sharedScramble) return sharedScramble.slice();
    if (initialRun) return (initialRun.initialGrid ?? initialRun.grid) as Color[];
    return (bootstrap?.grid ?? generateRandomRealPar().grid).slice();
  });
  const [clicks, setClicks] = useState(() => initialRun?.clicks ?? 0);

  const { elapsedMs, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer(
    initialRun?.elapsedMs ?? 0
  );

  const [difficulty, setDifficulty] = useState<Difficulty>("hard");

  const [dailyLoadStatus, setDailyLoadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPastOpen, setIsPastOpen] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isGlobalOptOpen, setIsGlobalOptOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const [globalOpt, setGlobalOpt] = useState<"yes" | "no" | null>(() =>
    typeof window === "undefined" ? null : loadGlobalOpt()
  );
  const [nickname, setNickname] = useState<string>(() =>
    typeof window === "undefined" ? "" : loadNickname()
  );

  const [lastSolvedRun, setLastSolvedRun] = useState<LastSolvedRun | null>(null);
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

  const loadDaily = useCallback(async () => {
    setDailyLoadStatus("loading");
    const todayId = utcDailyId();
    const cached = loadDailyState();

    const result = await fetchDaily();
    if (!result.ok) {
      setDailyLoadStatus("error");
      if (cached && cached.dailyId === todayId) {
        setPuzzleKind("daily");
        setPar(cached.par);
        setInitialGrid(cached.initialGrid.slice());
        setGrid(cached.grid.slice());
        setClicks(0);
        resetTimer();
        savedThisRunRef.current = false;
      }
      return;
    }

    const apiDailyId = result.dailyId || todayId;
    if (cached && cached.dailyId === apiDailyId) {
      const merged = {
        dailyId: apiDailyId,
        par: result.par,
        grid: cached.grid.slice(),
        initialGrid:
          cached.initialGrid?.length === SIZE * SIZE ? cached.initialGrid.slice() : result.grid.slice(),
      };
      saveDailyState(merged);
      setPuzzleKind("daily");
      setPar(merged.par);
      setInitialGrid(merged.initialGrid.slice());
      setGrid(merged.grid.slice());
    } else {
      const fresh = {
        dailyId: apiDailyId,
        par: result.par,
        grid: result.grid.slice(),
        initialGrid: result.grid.slice(),
      };
      saveDailyState(fresh);
      setPuzzleKind("daily");
      setPar(fresh.par);
      setInitialGrid(fresh.initialGrid.slice());
      setGrid(fresh.grid.slice());
    }

    setClicks(0);
    resetTimer();
    savedThisRunRef.current = false;
    setDailyLoadStatus("ready");
  }, [resetTimer]);

  const { dailyNum, nextDailyIn } = useDailyMeta(() => {
    if (activeScreen === "daily") void loadDaily();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialRun) return;
    if (sharedScramble) return;
    void loadDaily();
  }, [initialRun, loadDaily, sharedScramble]);

  // Analytics: screen views (powers DAU + funnels)
  useEffect(() => {
    trackScreen(activeScreen);
  }, [activeScreen]);

  // Persist run state only while playing the Daily
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeScreen !== "daily" || puzzleKind !== "daily") {
      clearRunState();
      return;
    }
    saveRunState({ puzzleKind, par, grid, initialGrid, clicks, elapsedMs });
  }, [activeScreen, puzzleKind, par, grid, initialGrid, clicks, elapsedMs]);

  // Stop timer + record solve once per puzzle
  useEffect(() => {
    if (!isSolved) return;
    stopTimer();
    if (savedThisRunRef.current) return;
    savedThisRunRef.current = true;

    const solvedKind = activeScreen === "practice" ? "practice" : "daily";
    track("puzzle_solved", {
      kind: solvedKind,
      par,
      clicks,
      time_ms: Math.round(elapsedMs),
      efficiency: efficiencyScore,
      daily_num: solvedKind === "daily" ? dailyNum : null,
    });

    setLastSolvedRun({
      kind: solvedKind,
      par,
      clicks,
      timeMs: Math.round(elapsedMs),
      efficiencyScore,
      iso: new Date().toISOString(),
    });

    if (activeScreen === "daily" && puzzleKind === "daily" && !globalOpt) {
      setIsGlobalOptOpen(true);
    }
  }, [isSolved, activeScreen, puzzleKind, par, clicks, elapsedMs, efficiencyScore, stopTimer, globalOpt, dailyNum]);

  const onTileClick = useCallback(
    (index: number) => {
      if (isSolved) return;
      if (clicks === 0) track("puzzle_started", { kind: puzzleKind });
      startTimer();
      setGrid((prev) => applyMove(prev, index));
      setClicks((c) => c + 1);
    },
    [isSolved, startTimer, clicks, puzzleKind]
  );

  const onShare = useCallback(() => {
    track("share_clicked", { kind: puzzleKind });
    setIsShareOpen(true);
  }, [puzzleKind]);

  const onReset = useCallback(() => {
    setGrid(initialGrid.slice());
    setClicks(0);
    resetTimer();
    savedThisRunRef.current = false;
  }, [initialGrid, resetTimer]);

  const generatePracticePuzzle = useCallback(
    (parTarget: number) => {
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
        if (sol.par === safePar) {
          bestGrid = g;
          bestPar = sol.par;
          break;
        }
        if (Math.abs(sol.par - safePar) < Math.abs(bestPar - safePar)) {
          bestGrid = g;
          bestPar = sol.par;
        }
      }

      const nextGrid =
        bestGrid ?? gridFromSolution(randomTargetColor(), new Array(SIZE * SIZE).fill(0));

      setPuzzleKind("practice");
      setPar(safePar);
      setInitialGrid(nextGrid.slice());
      setGrid(nextGrid);
      setClicks(0);
      resetTimer();
      savedThisRunRef.current = false;
    },
    [resetTimer]
  );

  // Lazy-load a practice puzzle the first time the user navigates to Practice
  useEffect(() => {
    if (activeScreen !== "practice") return;
    if (puzzleKind === "practice") return;
    generatePracticePuzzle(DIFFICULTY_TO_PAR[difficulty]);
  }, [activeScreen, puzzleKind, difficulty, generatePracticePuzzle]);

  const onDifficultyChange = useCallback(
    (d: Difficulty) => {
      setDifficulty(d);
      generatePracticePuzzle(DIFFICULTY_TO_PAR[d]);
    },
    [generatePracticePuzzle]
  );

  const onNicknameChange = useCallback((v: string) => {
    setNickname(v);
    saveNickname(v);
  }, []);

  // Sync difficulty pill with current practice PAR when restored from storage
  useEffect(() => {
    if (puzzleKind !== "practice") return;
    setDifficulty(pickDifficultyFromPar(par));
  }, [puzzleKind, par]);

  const shareText = useMemo(
    () =>
      buildShareText({
        kind: puzzleKind === "practice" ? "practice" : "daily",
        dailyNum,
        par,
        clicks,
        timeMs: Math.round(elapsedMs),
        scramble: initialGrid,
      }),
    [puzzleKind, dailyNum, par, clicks, elapsedMs, initialGrid]
  );

  let screenNode: React.ReactNode = null;
  if (activeScreen === "daily") {
    screenNode = (
      <DailyScreen
        resolved={resolved}
        onToggleTheme={toggle}
        par={par}
        elapsedMs={elapsedMs}
        clicks={clicks}
        score={efficiencyScore}
        grid={grid}
        isSolved={isSolved && puzzleKind === "daily"}
        loading={dailyLoadStatus === "loading"}
        dailyNum={dailyNum}
        nextDailyIn={nextDailyIn}
        onTileClick={onTileClick}
        onReset={onReset}
        onHint={() => setIsHelpOpen(true)}
        onPastScrambles={() => setIsPastOpen(true)}
        onShare={onShare}
      />
    );
  } else if (activeScreen === "practice") {
    screenNode = (
      <PracticeScreen
        resolved={resolved}
        onToggleTheme={toggle}
        par={par}
        elapsedMs={elapsedMs}
        clicks={clicks}
        score={efficiencyScore}
        grid={grid}
        isSolved={isSolved && puzzleKind === "practice"}
        difficulty={difficulty}
        onDifficultyChange={onDifficultyChange}
        onCustomComplexity={() => setIsCustomOpen(true)}
        onTileClick={onTileClick}
        onReset={onReset}
        onHint={() => setIsHelpOpen(true)}
        onPastScrambles={() => setIsPastOpen(true)}
        onShare={onShare}
      />
    );
  } else if (activeScreen === "profile") {
    screenNode = (
      <ProfileScreen
        resolved={resolved}
        onToggleTheme={toggle}
        nickname={nickname}
        onNicknameChange={onNicknameChange}
      />
    );
  } else if (activeScreen === "leaderboard") {
    screenNode = (
      <LeaderboardScreen
        resolved={resolved}
        onToggleTheme={toggle}
        lastSolvedRun={lastSolvedRun}
        practicePar={par}
        onPracticeParChange={(p) => {
          setPar(p);
          setDifficulty(pickDifficultyFromPar(p));
        }}
      />
    );
  } else {
    screenNode = (
      <SettingsScreen
        resolved={resolved}
        onToggleTheme={toggle}
        themePref={themePref}
        onThemePrefChange={setThemePref}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenVersion={() => setIsVersionOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenDonate={() => setIsDonateOpen(true)}
      />
    );
  }

  return (
    <div className="app-shell">
      <main className="app-shell__content">{screenNode}</main>

      <BottomNav active={activeScreen} onChange={setActiveScreen} />

      <VersionModal open={isVersionOpen} onClose={() => setIsVersionOpen(false)} />
      <ShareModal open={isShareOpen} onClose={() => setIsShareOpen(false)} shareText={shareText} />
      {isCustomOpen ? (
        <CustomComplexityModal
          open
          initialPar={par}
          onClose={() => setIsCustomOpen(false)}
          onGenerate={(p) => generatePracticePuzzle(p)}
        />
      ) : null}
      <FeedbackModal open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      <DonateModal open={isDonateOpen} onClose={() => setIsDonateOpen(false)} />
      <HelpModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <PastScramblesModal open={isPastOpen} onClose={() => setIsPastOpen(false)} />
      <GlobalOptModal
        open={isGlobalOptOpen}
        initialNickname={nickname}
        onClose={() => setIsGlobalOptOpen(false)}
        onSaved={(opt, nn) => {
          setGlobalOpt(opt);
          setNickname(nn);
        }}
      />
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
            background: "var(--bg)",
            color: "var(--fg)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
            App crashed (runtime error)
          </div>
          <div style={{ opacity: 0.85, marginBottom: 8 }}>{String(this.state.error)}</div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              opacity: 0.75,
              fontSize: 12,
              lineHeight: 1.35,
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              padding: 12,
              background: "var(--bg-elevated)",
            }}
          >
            {this.state.info}
          </pre>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
