import { useCallback } from "react";
import { useLongPress } from "../hooks/useLongPress";

const OPTIONS = ["A", "B", "C", "D"] as const;

interface Props {
  number: number;
  selected: string | undefined;
  correct: string;
  submitted: boolean;
  revealed: boolean;
  onSelect: (q: number, opt: string) => void;
  onClear: (q: number) => void;
  onReveal: (q: number) => void;
}

export function QuestionItem({
  number,
  selected,
  correct,
  submitted,
  revealed,
  onSelect,
  onClear,
  onReveal,
}: Props) {
  const canReveal = !!selected && !submitted && !revealed;
  const locked = submitted || revealed;

  const longPressHandlers = useLongPress(
    useCallback(() => {
      if (!canReveal) return;
      onReveal(number);
    }, [canReveal, number, onReveal]),
    useCallback(() => {}, []),
  );

  function optionClass(opt: string) {
    const base =
      "flex-1 py-1.5 rounded-md border text-sm font-semibold transition-colors duration-100";
    if (submitted) {
      if (opt === correct)
        return `${base} bg-success border-success text-white`;
      if (opt === selected && opt !== correct)
        return `${base} bg-danger border-danger text-white`;
      return `${base} bg-surface border-border text-muted opacity-40 cursor-default`;
    }
    if (opt === selected) return `${base} bg-accent border-accent text-white`;
    return `${base} bg-surface border-border text-text hover:border-accent cursor-pointer`;
  }

  function wrapperClass() {
    const base =
      "rounded-lg border p-3 transition-colors duration-150 bg-surface2";
    if (!submitted) return `${base} border-border`;
    if (!selected) return `${base} border-border opacity-50`;
    return selected === correct
      ? `${base} border-success`
      : `${base} border-danger`;
  }

  return (
    <div className={wrapperClass()} id={`q${number}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted">Q{number}</span>
        <div className="flex items-center gap-2">
          {!locked && selected && (
            <button
              className="text-xs text-muted hover:text-text transition-colors"
              onClick={() => onClear(number)}
            >
              clear
            </button>
          )}
          <button
            className={`text-xs px-2 py-0.5 rounded border transition-colors select-none
              ${
                revealed
                  ? "bg-accent border-accent text-white"
                  : canReveal
                    ? "border-border text-muted hover:text-text"
                    : "border-border text-border cursor-not-allowed opacity-40"
              }`}
            {...(canReveal ? longPressHandlers : {})}
            title={
              !selected
                ? "Answer first"
                : revealed
                  ? "Revealed"
                  : "Hold to reveal"
            }
          >
            {revealed ? `Ans: ${correct}` : "👁 Hold"}
          </button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={optionClass(opt)}
            onClick={() => !locked && onSelect(number, opt)}
            disabled={locked}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
