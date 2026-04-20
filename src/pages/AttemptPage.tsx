import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getAttempt,
  getTest,
  saveAttemptProgress,
  submitAttempt,
  secondsRemaining,
} from "../lib/db";
import { QuestionItem } from "../components/QuestionItem";
import { Timer } from "../components/Timer";
import type { Test, Attempt } from "../types";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";

const SAVE_DEBOUNCE_MS = 1200;

export default function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  const revealedRef = useRef(revealed);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);

  useEffect(() => {
    if (!attemptId || !user) return;
    getAttempt(attemptId).then(async (a) => {
      if (!a || a.userId !== user.uid) { navigate("/"); return; }
      const t = await getTest(a.testId);
      setAttempt(a);
      setTest(t);
      setAnswers(a.answers ?? {});
      setRevealed(new Set(a.revealedQuestions ?? []));
      if (a.status === "in-progress") {
        setSecsLeft(Math.floor(secondsRemaining(a)));
      }
      setLoading(false);
    });
  }, [attemptId, user, navigate]);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!attemptId) return;
      saveAttemptProgress(attemptId, answersRef.current, Array.from(revealedRef.current));
    }, SAVE_DEBOUNCE_MS);
  }

  function handleSelect(q: number, opt: string) {
    setAnswers((prev) => ({ ...prev, [q]: opt }));
    scheduleSave();
  }

  function handleClear(q: number) {
    setAnswers((prev) => { const next = { ...prev }; delete next[q]; return next; });
    scheduleSave();
  }

  function handleReveal(q: number) {
    setRevealed((prev) => { const next = new Set(prev); next.add(String(q)); return next; });
    scheduleSave();
  }

  const doSubmit = useCallback(async () => {
    if (!attemptId || !test || submitting) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSubmitting(true);
    const score = await submitAttempt(
      attemptId,
      answersRef.current,
      Array.from(revealedRef.current),
      test.answerKey,
    );
    setAttempt((prev) => prev ? { ...prev, status: "submitted", score, answers: answersRef.current } : prev);
    setSubmitting(false);
  }, [attemptId, test, submitting]);

  function confirmSubmit() {
    const unanswered = (test?.totalQuestions ?? 0) - Object.keys(answers).length;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Submit anyway?`
      : "Submit the test?";
    if (window.confirm(msg)) doSubmit();
  }

  function formatTs(ts: Timestamp | null) {
    if (!ts?.seconds) return "—";
    return format(new Date(ts.seconds * 1000), "dd MMM yyyy, hh:mm a");
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-muted text-sm">Loading…</div>;
  }
  if (!attempt || !test) return null;

  const submitted = attempt.status === "submitted";

  // ── Review mode ───────────────────────────────────────────────────
  if (submitted) {
    const score = attempt.score ?? 0;
    const answered = Object.keys(answers).length;
    const wrong = answered - score;
    const unanswered = test.totalQuestions - answered;
    const pct = Math.round((score / test.totalQuestions) * 100);

    return (
      <div className="min-h-screen bg-bg">
        <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/tests/${test.id}`)} className="text-muted hover:text-text transition-colors text-sm">
            ← Back
          </button>
          <h1 className="font-semibold text-text text-sm truncate">{test.title}</h1>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
            <p className="text-3xl font-bold text-text mb-1">
              {score}<span className="text-lg font-normal text-muted">/{test.totalQuestions}</span>
            </p>
            <p className="text-sm text-muted mb-3">{pct}% · {formatTs(attempt.submittedAt)}</p>
            <div className="flex gap-4 text-sm">
              <span className="text-success font-semibold">✓ {score} correct</span>
              <span className="text-danger font-semibold">✗ {wrong} wrong</span>
              <span className="text-muted">— {unanswered} skipped</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {Array.from({ length: test.totalQuestions }, (_, i) => i + 1).map((n) => (
              <QuestionItem
                key={n}
                number={n}
                selected={answers[n]}
                correct={test.answerKey[n]}
                submitted={true}
                revealed={false}
                onSelect={() => {}}
                onClear={() => {}}
                onReveal={() => {}}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── Active attempt mode ───────────────────────────────────────────
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-muted font-medium truncate max-w-[50%]">{test.title}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted">{answered}/{test.totalQuestions}</span>
          {secsLeft !== null && <Timer secondsLeft={secsLeft} onExpire={doSubmit} />}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl w-full mx-auto">
        <div className="flex flex-col gap-2.5 pb-24">
          {Array.from({ length: test.totalQuestions }, (_, i) => i + 1).map((n) => (
            <QuestionItem
              key={n}
              number={n}
              selected={answers[n]}
              correct={test.answerKey[n]}
              submitted={false}
              revealed={revealed.has(String(n))}
              onSelect={handleSelect}
              onClear={handleClear}
              onReveal={handleReveal}
            />
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-3 bg-linear-to-t from-bg to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            onClick={confirmSubmit}
            disabled={submitting}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg"
          >
            {submitting ? "Submitting…" : `Submit Test (${answered}/${test.totalQuestions})`}
          </button>
        </div>
      </div>
    </div>
  );
}
