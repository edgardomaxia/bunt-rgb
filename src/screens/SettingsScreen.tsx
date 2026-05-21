import type { ThemePref } from "../lib/storage";
import { APP_STATUS, APP_VERSION } from "../meta/appMeta";
import { BUILD_INFO } from "../meta/buildInfo";
import { Header } from "../components/layout/Header";

type Props = {
  resolved: "light" | "dark";
  onToggleTheme: () => void;
  themePref: ThemePref;
  onThemePrefChange: (p: ThemePref) => void;
  onOpenHelp: () => void;
  onOpenVersion: () => void;
  onOpenFeedback: () => void;
  onOpenDonate: () => void;
};

const PILL_STYLE: React.CSSProperties = {
  flex: 1,
  padding: "10px 8px",
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "transparent",
  color: "var(--fg)",
  fontWeight: 800,
  letterSpacing: 1,
  fontSize: 12,
};

const PILL_ACTIVE: React.CSSProperties = {
  ...PILL_STYLE,
  background: "var(--button-active-bg)",
  color: "var(--button-active-fg)",
  borderColor: "var(--button-active-bg)",
};

const LINK_BTN: React.CSSProperties = {
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "transparent",
  color: "var(--fg)",
  fontWeight: 700,
  fontSize: 14,
};

export function SettingsScreen({
  resolved,
  onToggleTheme,
  themePref,
  onThemePrefChange,
  onOpenHelp,
  onOpenVersion,
  onOpenFeedback,
  onOpenDonate,
}: Props) {
  const themes: ThemePref[] = ["light", "dark", "system"];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <Header subtitle="SETTINGS" resolved={resolved} onToggleTheme={onToggleTheme} />

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--fg-muted)" }}>
          THEME
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {themes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onThemePrefChange(t)}
              style={themePref === t ? PILL_ACTIVE : PILL_STYLE}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--fg-muted)" }}>
          INFO
        </label>
        <button type="button" style={LINK_BTN} onClick={onOpenHelp}>
          <span>How it works</span>
          <span style={{ opacity: 0.5 }}>›</span>
        </button>
        <button type="button" style={LINK_BTN} onClick={onOpenVersion}>
          <span>Version history</span>
          <span style={{ opacity: 0.5, fontSize: 12 }}>v{APP_VERSION}</span>
        </button>
        <button type="button" style={LINK_BTN} onClick={onOpenFeedback}>
          <span>Send feedback</span>
          <span style={{ opacity: 0.5 }}>›</span>
        </button>
        <button type="button" style={LINK_BTN} onClick={onOpenDonate}>
          <span>Donate</span>
          <span style={{ opacity: 0.5 }}>›</span>
        </button>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--fg-muted)" }}>
          LINKS
        </label>
        <a href="https://bunt-rgb.com/" target="_blank" rel="noopener noreferrer" style={{ ...LINK_BTN, textDecoration: "none" }}>
          <span>Official website</span>
          <span style={{ opacity: 0.5 }}>↗</span>
        </a>
        <a href="https://www.youtube.com/@BuntRGB" target="_blank" rel="noopener noreferrer" style={{ ...LINK_BTN, textDecoration: "none" }}>
          <span>Devlog (YouTube)</span>
          <span style={{ opacity: 0.5 }}>↗</span>
        </a>
      </section>

      <footer
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textAlign: "center",
          padding: "12px 0",
          opacity: 0.7,
        }}
      >
        {APP_STATUS} · {BUILD_INFO.vercelEnv} · {BUILD_INFO.gitBranch} · EM ·{" "}
        {BUILD_INFO.gitSha === "local" ? "local" : BUILD_INFO.gitSha.slice(0, 7)}
      </footer>
    </div>
  );
}
