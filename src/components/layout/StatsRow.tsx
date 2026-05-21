import { formatTimeMs } from "../../lib/format";

type Props = {
  par: number;
  elapsedMs: number;
  clicks: number;
  score: number;
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ fontWeight: 900, fontSize: 22, color: "var(--fg)", letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1.5, color: "var(--fg-muted)" }}>{label}</div>
    </div>
  );
}

export function StatsRow({ par, elapsedMs, clicks, score }: Props) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
      }}
    >
      <Stat value={String(par)} label="PAR" />
      <Stat value={formatTimeMs(elapsedMs)} label="TIME" />
      <Stat value={String(clicks)} label="MOVES" />
      <Stat value={String(score)} label="SCORE" />
    </div>
  );
}
