import { SIZE } from "../engine/engine";
import type { Color } from "../engine/types";

const RUN_STATE_KEY = "bunt_rgb_run_state_v1";
const DAILY_STATE_KEY = "bunt_rgb_daily_state_v1";
const GLOBAL_OPT_KEY = "bunt_rgb_global_opt_in_v1";
const NICKNAME_KEY = "bunt_rgb_nickname_v1";
const THEME_KEY = "bunt_rgb_theme_v1";

export type GameKind = "daily" | "practice";

export type RunState = {
  puzzleKind: GameKind;
  par: number;
  grid: Color[];
  initialGrid: Color[];
  clicks: number;
  elapsedMs: number;
};

export type DailyState = {
  dailyId: string;
  par: number;
  grid: Color[];
  initialGrid: Color[];
};

export type ThemePref = "light" | "dark" | "system";

export function loadRunState(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RunState>;
    if (!parsed.puzzleKind || parsed.par == null || !parsed.grid) return null;
    if (!Array.isArray(parsed.grid) || parsed.grid.length !== SIZE * SIZE) return null;

    const initialGrid =
      Array.isArray((parsed as { initialGrid?: Color[] }).initialGrid) &&
      (parsed as { initialGrid: Color[] }).initialGrid.length === SIZE * SIZE
        ? ((parsed as { initialGrid: Color[] }).initialGrid as Color[])
        : (parsed.grid as Color[]);

    const kind: GameKind = parsed.puzzleKind === "practice" ? "practice" : "daily";

    return {
      puzzleKind: kind,
      par: Number(parsed.par),
      grid: parsed.grid as Color[],
      initialGrid,
      clicks: Number(parsed.clicks ?? 0),
      elapsedMs: Number(parsed.elapsedMs ?? 0),
    };
  } catch {
    return null;
  }
}

export function saveRunState(state: RunState) {
  localStorage.setItem(RUN_STATE_KEY, JSON.stringify(state));
}

export function clearRunState() {
  localStorage.removeItem(RUN_STATE_KEY);
}

export function loadDailyState(): DailyState | null {
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DailyState>;
    if (!parsed.dailyId) return null;
    if (parsed.par == null) return null;
    if (!Array.isArray(parsed.grid) || parsed.grid.length !== SIZE * SIZE) return null;

    const initialGrid =
      Array.isArray((parsed as { initialGrid?: Color[] }).initialGrid) &&
      (parsed as { initialGrid: Color[] }).initialGrid.length === SIZE * SIZE
        ? ((parsed as { initialGrid: Color[] }).initialGrid as Color[])
        : (parsed.grid as Color[]);

    return {
      dailyId: String(parsed.dailyId),
      par: Number(parsed.par),
      grid: parsed.grid as Color[],
      initialGrid,
    };
  } catch {
    return null;
  }
}

export function saveDailyState(state: DailyState) {
  localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(state));
}

export function loadGlobalOpt(): "yes" | "no" | null {
  try {
    const v = localStorage.getItem(GLOBAL_OPT_KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

export function saveGlobalOpt(v: "yes" | "no") {
  try {
    localStorage.setItem(GLOBAL_OPT_KEY, v);
  } catch {
    /* noop */
  }
}

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveNickname(v: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, v);
  } catch {
    /* noop */
  }
}

export function loadThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
    return "system";
  } catch {
    return "system";
  }
}

export function saveThemePref(v: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, v);
  } catch {
    /* noop */
  }
}
