import type { ReactNode } from "react";
import {
  DailyIcon,
  LeaderboardIcon,
  PracticeIcon,
  ProfileIcon,
  SettingsIcon,
} from "../icons/Icons";

export type ScreenId = "profile" | "leaderboard" | "daily" | "practice" | "settings";

type Item = {
  id: ScreenId;
  label: string;
  icon: ReactNode;
};

const ITEMS: Item[] = [
  { id: "profile", label: "Profile", icon: <ProfileIcon size={26} /> },
  { id: "leaderboard", label: "Leaderboard", icon: <LeaderboardIcon size={26} /> },
  { id: "daily", label: "Daily", icon: <DailyIcon size={26} /> },
  { id: "practice", label: "Practice", icon: <PracticeIcon size={26} /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon size={26} /> },
];

type Props = {
  active: ScreenId;
  onChange: (id: ScreenId) => void;
};

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "var(--bg)",
        borderTop: "1px solid var(--border-soft)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)",
        zIndex: 20,
      }}
    >
      {ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "4px 6px",
              color: isActive ? "var(--fg)" : "var(--fg-muted)",
              position: "relative",
              minWidth: 44,
            }}
          >
            {item.icon}
            {isActive ? (
              <span
                style={{
                  position: "absolute",
                  bottom: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 3,
                  background: "var(--fg)",
                  borderRadius: 2,
                }}
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
