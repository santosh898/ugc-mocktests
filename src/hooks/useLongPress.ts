import { useRef, useCallback } from "react";

const LONG_PRESS_DURATION = 500;

export function useLongPress(onLongPress: () => void, onRelease?: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      timerRef.current = setTimeout(onLongPress, LONG_PRESS_DURATION);
    },
    [onLongPress],
  );

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onRelease?.();
  }, [onRelease]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
