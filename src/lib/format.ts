import { BUILD_INFO } from "../meta/buildInfo";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function formatTimeMs(ms: number) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

export function formatOnlineIso(iso: string) {
  const fmt = (d: Date) => {
    const date = d.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const off = -d.getTimezoneOffset() / 60;
    const sign = off >= 0 ? "+" : "-";
    const hh = String(Math.abs(off)).padStart(2, "0");
    return `online: ${date}, ${time} (GMT${sign}${hh})`;
  };

  if (iso === "TBD") return "online: TBD";

  if (iso === "AUTO") {
    const d = new Date(BUILD_INFO.builtAtIso);
    if (BUILD_INFO.builtAtIso === "local") return "online: local";
    if (Number.isNaN(d.getTime())) return "online: local";
    return fmt(d);
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `online: ${iso}`;
  return fmt(d);
}
