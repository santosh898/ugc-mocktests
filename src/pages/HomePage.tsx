import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserTests, createTest, deleteTest } from "../lib/db";
import { AI_PROMPT } from "../lib/constants";
import { Modal } from "../components/Modal";
import type { Test } from "../types";

export default function HomePage() {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [timerInput, setTimerInput] = useState("");
  const [answerKeyInput, setAnswerKeyInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const loadTests = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getUserTests(user.uid).then((data) => {
      setTests(data);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  async function handleCreate() {
    setFormError("");
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    let answerKey: Record<string, string>;
    try {
      answerKey = new Function(`return (${answerKeyInput})`)() as Record<
        string,
        string
      >;
      if (typeof answerKey !== "object" || Array.isArray(answerKey))
        throw new Error();
    } catch {
      setFormError(
        'Invalid answer key. Paste a valid JS object like {1:"A",2:"C",...}',
      );
      return;
    }
    const total = Object.keys(answerKey).length;
    const timer = parseInt(timerInput) || total;
    setCreating(true);
    try {
      const id = await createTest(user!.uid, {
        title: title.trim(),
        answerKey: Object.fromEntries(
          Object.entries(answerKey).map(([k, v]) => [
            String(k),
            String(v).toUpperCase(),
          ]),
        ),
        timerMinutes: timer,
      });
      setShowModal(false);
      setTitle("");
      setTimerInput("");
      setAnswerKeyInput("");
      navigate(`/tests/${id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(
    e: React.MouseEvent,
    id: string,
    testTitle: string,
  ) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${testTitle}" and all its attempts?`)) return;
    await deleteTest(id, user!.uid);
    setTests((prev) => prev.filter((t) => t.id !== id));
  }

  function copyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-text text-base">UGC NET Practice</h1>
        <div className="flex items-center gap-3">
          <img
            src={user?.photoURL ?? ""}
            alt=""
            className="w-7 h-7 rounded-full"
          />
          <button
            onClick={signOutUser}
            className="text-xs text-muted hover:text-text transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            My Tests
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Create
          </button>
        </div>

        {loading ? (
          <p className="text-muted text-sm text-center py-16">Loading…</p>
        ) : tests.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-sm mb-3">No tests yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-accent hover:underline text-sm"
            >
              Create your first test →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tests.map((test) => (
              <div
                key={test.id}
                onClick={() => navigate(`/tests/${test.id}`)}
                className="bg-surface border border-border rounded-xl px-4 py-4 cursor-pointer hover:border-accent transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text text-sm">
                      {test.title}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {test.totalQuestions} questions · {test.timerMinutes} min
                    </p>
                  </div>
                  {/* Delete — intentionally low-visibility */}
                  <button
                    onClick={(e) => handleDelete(e, test.id, test.title)}
                    className="text-[10px] text-surface2 group-hover:text-muted transition-colors mt-0.5 shrink-0"
                    title="Delete test"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Copy AI Prompt — fixed corner */}
      <button
        onClick={copyPrompt}
        className="fixed bottom-5 right-5 text-xs bg-surface2 border border-border text-muted hover:text-text px-3 py-2 rounded-lg transition-colors shadow-lg"
        title="Copy ChatGPT prompt to extract answer key from image"
      >
        {copied ? "✓ Copied" : "🤖 Copy AI Prompt"}
      </button>

      {/* Create Modal */}
      {showModal && (
        <Modal title="Create Mock Test" onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CS Paper III – Dec 2023"
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Timer (minutes){" "}
                <span className="font-normal opacity-60">
                  — default = question count
                </span>
              </label>
              <input
                type="number"
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
                placeholder="e.g. 75"
                min={1}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Answer Key
              </label>
              <textarea
                value={answerKeyInput}
                onChange={(e) => setAnswerKeyInput(e.target.value)}
                placeholder={`{1:'A',2:'C',3:'B',...}`}
                rows={5}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent font-mono resize-none"
              />
            </div>
            {formError && <p className="text-xs text-danger">{formError}</p>}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-2.5 transition-colors"
            >
              {creating ? "Creating…" : "Create Test"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
