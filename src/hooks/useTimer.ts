import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer(initialMs: number = 0) {
  const [elapsedMs, setElapsedMs] = useState(initialMs);
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!runningRef.current || startTimeRef.current == null) return;
    const now = performance.now();
    setElapsedMs(now - startTimeRef.current);
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    startTimeRef.current = performance.now() - elapsedMs;
    rafIdRef.current = requestAnimationFrame(tick);
  }, [elapsedMs, tick]);

  const reset = useCallback(() => {
    stop();
    startTimeRef.current = null;
    setElapsedMs(0);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { elapsedMs, setElapsedMs, start, stop, reset, isRunning: () => runningRef.current };
}
