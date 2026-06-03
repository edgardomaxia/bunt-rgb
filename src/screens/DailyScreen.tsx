import type { Color } from "../engine/types";
import { Header } from "../components/layout/Header";
import { StatsRow } from "../components/layout/StatsRow";
import { Sidebar } from "../components/layout/Sidebar";
import { Grid } from "../components/game/Grid";
import { ResetButton } from "../components/game/ResetButton";

type Props = {
  resolved: "light" | "dark";
  onToggleTheme: () => void;

  par: number;
  elapsedMs: number;
  clicks: number;
  score: number;

  grid: Color[];
  isSolved: boolean;
  loading: boolean;

  dailyNum: number;
  nextDailyIn: string;

  onTileClick: (i: number) => void;
  onReset: () => void;
  onHint: () => void;
  onPastScrambles: () => void;
  onShare: () => void;
};

export function DailyScreen(props: Props) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <Header subtitle="DAILY SCRAMBLE" resolved={props.resolved} onToggleTheme={props.onToggleTheme} />
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
        <div style={{ position: "relative" }}>
          <Grid grid={props.grid} onTileClick={props.onTileClick} disabled={props.isSolved} />
          {props.loading ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--modal-backdrop)",
                color: "var(--fg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              Loading…
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 11, letterSpacing: 2, color: "var(--fg-muted)", fontWeight: 700 }}>
        DAILY SCRAMBLE #{String(props.dailyNum).padStart(4, "0")} • NEXT IN {props.nextDailyIn}
      </div>

      <ResetButton onClick={props.onReset} />

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
