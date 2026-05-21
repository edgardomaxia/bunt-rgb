import Leaderboards, { type LastSolvedRun } from "../components/Leaderboards";
import { Header } from "../components/layout/Header";

type Props = {
  resolved: "light" | "dark";
  onToggleTheme: () => void;
  lastSolvedRun: LastSolvedRun | null;
  practicePar: number;
  onPracticeParChange: (p: number) => void;
};

export function LeaderboardScreen({ resolved, onToggleTheme, lastSolvedRun, practicePar, onPracticeParChange }: Props) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <Header subtitle="LEADERBOARD" resolved={resolved} onToggleTheme={onToggleTheme} />
      <Leaderboards
        visible
        lastSolvedRun={lastSolvedRun}
        practicePar={practicePar}
        onPracticeParChange={onPracticeParChange}
        defaultView="local"
        lockView="local"
      />
    </div>
  );
}
