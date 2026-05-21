import { Header } from "../components/layout/Header";

type Props = {
  resolved: "light" | "dark";
  onToggleTheme: () => void;
  nickname: string;
  onNicknameChange: (v: string) => void;
};

export function ProfileScreen({ resolved, onToggleTheme, nickname, onNicknameChange }: Props) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <Header subtitle="PROFILE" resolved={resolved} onToggleTheme={onToggleTheme} />

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--fg-muted)" }}>
          NICKNAME
        </label>
        <input
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="e.g. axiomizer"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--border-soft)",
            background: "var(--bg-elevated)",
            color: "var(--fg)",
            outline: "none",
            fontSize: 16,
            fontFamily: "inherit",
          }}
        />
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          Used for the Global Leaderboard. Optional.
        </div>
      </section>

      <section
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid var(--border-soft)",
          color: "var(--fg-muted)",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        Stats overview coming soon: streak, average PAR, total solves.
      </section>
    </div>
  );
}
