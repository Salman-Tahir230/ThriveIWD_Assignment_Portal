import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
} from 'firebase/firestore';

/**
 * Helper to convert Firestore document snapshots to plain objects
 * and ensure any Firestore Timestamps (startDate, submittedAt, gradedAt, createdAt)
 * are converted to native JavaScript Date objects matching the mock return shape.
 */
function sanitizeDoc(docSnap) {
  if (!docSnap || !docSnap.exists()) return null;
  const data = docSnap.data();
  const result = { id: docSnap.id, ...data };
  for (const [key, value] of Object.entries(result)) {
    if (value && typeof value.toDate === 'function') {
      result[key] = value.toDate();
    }
  }
  return result;
}

export async function getStudentByEmail(email) {
  if (!db || !email) return null;
  const trimmed = email.trim();
  let q = query(collection(db, 'students'), where('email', '==', trimmed));
  let snap = await getDocs(q);
  if (snap.empty && trimmed !== trimmed.toLowerCase()) {
    q = query(collection(db, 'students'), where('email', '==', trimmed.toLowerCase()));
    snap = await getDocs(q);
  }
  if (snap.empty) return null;
  return sanitizeDoc(snap.docs[0]);
}

export async function getMockSignedInStudent() {
  if (!db) return null;
  const docRef = doc(db, 'students', 'student_jane_doe');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return sanitizeDoc(snap);
  }
  return null;
}

export async function getCohort(cohortId) {
  if (!db || !cohortId) return null;
  const docRef = doc(db, 'cohorts', cohortId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return sanitizeDoc(snap);
}

export async function getAssignmentsForCohort(cohortId) {
  if (!db || !cohortId) return [];
  const q = query(
    collection(db, 'assignments'),
    where('cohortId', '==', cohortId)
  );
  const snap = await getDocs(q);
  const assignments = snap.docs.map((d) => sanitizeDoc(d));
  return assignments.sort((a, b) => a.weekNumber - b.weekNumber);
}

export async function getSubmissionsForStudent(studentId) {
  if (!db || !studentId) return [];
  const q = query(
    collection(db, 'submissions'),
    where('studentId', '==', studentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => sanitizeDoc(d));
}

export async function submitAssignment({ studentId, assignment, fileName }) {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your .env.local file.');
  }
  const submittedAt = new Date();
  const submissionData = {
    studentId,
    assignmentId: assignment.id,
    cohortId: assignment.cohortId,
    weekNumber: assignment.weekNumber,
    fileName,
    status: 'pending_review',
    score: null,
    submittedAt,
    gradedAt: null,
  };
  const docRef = await addDoc(collection(db, 'submissions'), submissionData);
  return {
    id: docRef.id,
    ...submissionData,
  };
}

export async function mockGradeSubmission(submissionId, score = 75) {
  if (!db || !submissionId) return null;
  const docRef = doc(db, 'submissions', submissionId);
  const gradedAt = new Date();
  await updateDoc(docRef, {
    status: 'graded',
    score,
    gradedAt,
  });
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return sanitizeDoc(snap);
}
