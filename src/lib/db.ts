import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Test, Attempt } from "../types";

// ── Tests ────────────────────────────────────────────────

export async function createTest(
  uid: string,
  data: {
    title: string;
    answerKey: Record<string, string>;
    timerMinutes: number;
  },
): Promise<string> {
  const totalQuestions = Object.keys(data.answerKey).length;
  const ref = await addDoc(collection(db, "tests"), {
    ...data,
    totalQuestions,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserTests(uid: string): Promise<Test[]> {
  const q = query(
    collection(db, "tests"),
    where("createdBy", "==", uid),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Test);
}

export async function getTest(testId: string): Promise<Test | null> {
  const snap = await getDoc(doc(db, "tests", testId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Test;
}

export async function deleteTest(testId: string, uid: string): Promise<void> {
  // Cascade delete only this user's attempts (matches Firestore security rules)
  const q = query(
    collection(db, "attempts"),
    where("testId", "==", testId),
    where("userId", "==", uid),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "tests", testId));
}

// ── Attempts ─────────────────────────────────────────────

export async function createAttempt(uid: string, test: Test): Promise<string> {
  const ref = await addDoc(collection(db, "attempts"), {
    userId: uid,
    testId: test.id,
    answers: {},
    revealedQuestions: [],
    score: null,
    status: "in-progress",
    timerMinutes: test.timerMinutes,
    startedAt: serverTimestamp(),
    submittedAt: null,
  });
  return ref.id;
}

export async function getAttempt(attemptId: string): Promise<Attempt | null> {
  const snap = await getDoc(doc(db, "attempts", attemptId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Attempt;
}

export async function getTestAttempts(
  testId: string,
  uid: string,
): Promise<Attempt[]> {
  const q = query(
    collection(db, "attempts"),
    where("testId", "==", testId),
    where("userId", "==", uid),
    orderBy("startedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Attempt);
}

export async function getInProgressAttempt(
  testId: string,
  uid: string,
): Promise<Attempt | null> {
  const q = query(
    collection(db, "attempts"),
    where("testId", "==", testId),
    where("userId", "==", uid),
    where("status", "==", "in-progress"),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Attempt;
}

export async function saveAttemptProgress(
  attemptId: string,
  answers: Record<string, string>,
  revealedQuestions: string[],
): Promise<void> {
  await updateDoc(doc(db, "attempts", attemptId), {
    answers,
    revealedQuestions,
  });
}

export async function submitAttempt(
  attemptId: string,
  answers: Record<string, string>,
  revealedQuestions: string[],
  answerKey: Record<string, string>,
): Promise<number> {
  const score = Object.keys(answerKey).filter(
    (q) => answers[q] === answerKey[q],
  ).length;
  await updateDoc(doc(db, "attempts", attemptId), {
    answers,
    revealedQuestions,
    score,
    status: "submitted",
    submittedAt: serverTimestamp(),
  });
  return score;
}

export async function discardAttempt(attemptId: string): Promise<void> {
  await deleteDoc(doc(db, "attempts", attemptId));
}

export function secondsRemaining(attempt: Attempt): number {
  const startedAt = attempt.startedAt as Timestamp;
  if (!startedAt?.seconds) return attempt.timerMinutes * 60;
  const elapsed = Date.now() / 1000 - startedAt.seconds;
  return Math.max(0, attempt.timerMinutes * 60 - elapsed);
}
