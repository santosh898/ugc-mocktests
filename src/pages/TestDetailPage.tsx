import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getTest,
  getTestAttempts,
  getInProgressAttempt,
  createAttempt,
  discardAttempt,
  deleteTest,
} from "../lib/db";
import { format } from "date-fns";
import type { Test, Attempt } from "../types";
import { Timestamp } from "firebase/firestore";

export default function TestDetailPage() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [inProgress, setInProgress] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleDelete() {
    if (!test || !user) return;
    setMenuOpen(false);
    if (!window.confirm(`Delete "${test.title}" and all its attempts?`)) return;
    await deleteTest(test.id, user.uid);
    navigate("/");
  }

  const load = useCallback(() => {
    if (!testId || !user) return;
    setLoading(true);
    Promise.all([
      getTest(testId),
      getTestAttempts(testId, user.uid),
      getInProgressAttempt(testId, user.uid),
    ]).then(([t, a, ip]) => {
      setTest(t);
      setAttempts(a.filter((x) => x.status === "submitted"));
      setInProgress(ip);
      setLoading(false);
    });
  }, [testId, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart() {
    if (!test || !user) return;
    setStarting(true);
    const id = await createAttempt(user.uid, test);
    navigate(`/attempts/${id}`);
  }

  async function handleResume() {
    if (!inProgress) return;
    navigate(`/attempts/${inProgress.id}`);
  }

  async function handleDiscard() {
    if (!inProgress) return;
    if (!window.confirm("Discard in-progress attempt and start fresh?")) return;
    await discardAttempt(inProgress.id);
    setInProgress(null);
  }

  function formatTs(ts: Timestamp | null) {
    if (!ts?.seconds) return "—";
    return format(new Date(ts.seconds * 1000), "dd MMM yyyy, hh:mm a");
  }

  function formatDuration(start: Timestamp | null, end: Timestamp | null) {
    if (!start?.seconds || !end?.seconds) return null;
    const secs = Math.round(end.seconds - start.seconds);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted text-sm">
        Loading…
      </div>
    );
  }
  if (!test) {
    return (
      <div className="flex items-center justify-center h-screen text-muted text-sm">
        Test not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-muted hover:text-text transition-colors text-sm"
        >
          ← Back
        </button>
        <h1 className="font-semibold text-text text-sm truncate flex-1">
          {test.title}
        </h1>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-muted hover:text-text transition-colors px-2 py-1 text-base leading-none"
            title="More options"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-xl min-w-32.5 py-1">
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-surface2 transition-colors"
                >
                  Delete test
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Meta */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-6 flex gap-6">
          <div>
            <p className="text-xs text-muted">Questions</p>
            <p className="text-lg font-bold text-text">{test.totalQuestions}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Timer</p>
            <p className="text-lg font-bold text-text">
              {test.timerMinutes} min
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Attempts</p>
            <p className="text-lg font-bold text-text">{attempts.length}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mb-8">
          {inProgress ? (
            <div className="bg-surface2 border border-accent/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text">
                  In-progress attempt
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Started {formatTs(inProgress.startedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResume}
                  className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Resume
                </button>
                <button
                  onClick={handleDiscard}
                  className="text-xs text-muted hover:text-danger transition-colors px-2"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {starting ? "Starting…" : "Start New Attempt"}
            </button>
          )}
        </div>

        {/* History */}
        {attempts.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              History
            </h2>
            <div className="flex flex-col gap-2">
              {attempts.map((a) => {
                const pct = Math.round(
                  ((a.score ?? 0) / test.totalQuestions) * 100,
                );
                return (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/attempts/${a.id}`)}
                    className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-accent transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {a.score}/{test.totalQuestions}
                        <span className="ml-2 text-xs font-normal text-muted">
                          {pct}%
                        </span>
                        {formatDuration(a.startedAt, a.submittedAt) && (
                          <span className="ml-2 text-xs font-normal text-muted">
                            · {formatDuration(a.startedAt, a.submittedAt)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {formatTs(a.submittedAt)}
                      </p>
                    </div>
                    <span className="text-xs text-muted">Review →</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
