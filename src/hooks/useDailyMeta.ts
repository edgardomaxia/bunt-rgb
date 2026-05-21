import { useEffect, useState } from "react";
import { dailyNumberFromId, formatCountdown, nextDailyUtcMs, utcDailyId } from "../meta/dailyMeta";

export function useDailyMeta(onDayRollover?: () => void) {
  const [dailyId, setDailyId] = useState<string>(() => utcDailyId());
  const [dailyNum, setDailyNum] = useState<number>(() => dailyNumberFromId(utcDailyId()));
  const [nextDailyIn, setNextDailyIn] = useState<string>(() =>
    formatCountdown(nextDailyUtcMs(new Date()) - Date.now())
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tick = () => {
      const now = Date.now();
      const msLeft = nextDailyUtcMs(new Date()) - now;
      setNextDailyIn(formatCountdown(msLeft));

      const idNow = utcDailyId();
      if (idNow !== dailyId) {
        setDailyId(idNow);
        setDailyNum(dailyNumberFromId(idNow));
        onDayRollover?.();
      }
    };

    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [dailyId, onDayRollover]);

  return { dailyId, dailyNum, nextDailyIn };
}
