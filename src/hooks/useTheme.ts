import { useCallback, useEffect, useState } from "react";
import { loadThemePref, saveThemePref, type ThemePref } from "../lib/storage";

type ResolvedTheme = "light" | "dark";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

function applyThemeToDom(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() =>
    typeof window === "undefined" ? "system" : loadThemePref()
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(pref));

  useEffect(() => {
    applyThemeToDom(resolved);
  }, [resolved]);

  useEffect(() => {
    setResolved(resolveTheme(pref));
  }, [pref]);

  useEffect(() => {
    if (pref !== "system") return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(systemPrefersDark() ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const setThemePref = useCallback((next: ThemePref) => {
    setPref(next);
    saveThemePref(next);
  }, []);

  const toggle = useCallback(() => {
    setThemePref(resolved === "dark" ? "light" : "dark");
  }, [resolved, setThemePref]);

  return { pref, resolved, setThemePref, toggle };
}
