import { useEffect, useState } from "react";

interface Props {
  secondsLeft: number;
  onExpire: () => void;
}

export function Timer({ secondsLeft: initial, onExpire }: Props) {
  const [secs, setSecs] = useState(Math.floor(initial));

  useEffect(() => {
    setSecs(Math.floor(initial));
  }, [initial]);

  useEffect(() => {
    if (secs <= 0) {
      onExpire();
      return;
    }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs, onExpire]);

  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  const urgent = secs < 300;

  return (
    <span
      className={`font-mono font-bold tabular-nums ${urgent ? "text-danger" : "text-text"}`}
    >
      {m}:{s}
    </span>
  );
}
