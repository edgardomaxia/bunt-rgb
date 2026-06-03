import type { Color } from "../engine/types";
import { Header } from "../components/layout/Header";
import { StatsRow } from "../components/layout/StatsRow";
import { Sidebar } from "../components/layout/Sidebar";
import { Grid } from "../components/game/Grid";
import { ResetButton } from "../components/game/ResetButton";
import { DifficultyButtons, type Difficulty } from "../components/game/DifficultyButtons";

type Props = {
  resolved: "light" | "dark";
  onToggleTheme: () => void;

  par: number;
  elapsedMs: number;
  clicks: number;
  score: number;

  grid: Color[];
  isSolved: boolean;

  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onCustomComplexity?: () => void;

  onTileClick: (i: number) => void;
  onReset: () => void;
  onHint: () => void;
  onPastScrambles: () => void;
  onShare: () => void;
};

export function PracticeScreen(props: Props) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <Header subtitle="PRACTICE" resolved={props.resolved} onToggleTheme={props.onToggleTheme} />
      <StatsRow par={props.par} elapsedMs={props.elapsedMs} clicks={props.clicks} score={props.score} />

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          maxWidth: "100%",
          marginTop: 6,
        }}
      >
        <Sidebar onHint={props.onHint} onPastScrambles={props.onPastScrambles} />
        <Grid grid={props.grid} onTileClick={props.onTileClick} disabled={props.isSolved} />
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <DifficultyButtons
          active={props.difficulty}
          onChange={props.onDifficultyChange}
          onCustom={props.onCustomComplexity}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ResetButton onClick={props.onReset} />
        </div>
      </div>

      {props.isSolved ? (
        <button
          type="button"
          onClick={props.onShare}
          style={{
            background: "var(--button-active-bg)",
            color: "var(--button-active-fg)",
            border: "none",
            borderRadius: 999,
            padding: "14px 32px",
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          SHARE
        </button>
      ) : null}
    </div>
  );
}
