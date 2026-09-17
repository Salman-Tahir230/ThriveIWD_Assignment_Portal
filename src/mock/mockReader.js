import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
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

export async function getOrCreateStudentByEmail(email) {
  const existing = await getStudentByEmail(email);
  if (existing) return existing;

  const defaultCohortQuery = query(
    collection(db, 'cohorts'),
    where('isDefault', '==', true),
    limit(1)
  );
  const snap = await getDocs(defaultCohortQuery);
  if (snap.empty) {
    throw new Error('No default cohort configured — cannot auto-enroll.');
  }
  const cohort = { id: snap.docs[0].id, ...snap.docs[0].data() };

  const displayName = email
    .split('@')[0]
    .replace(/[._]+/g, ' ')
    .replace(/\\b\\w/g, (c) => c.toUpperCase());

  const newStudent = {
    participantId: null, // unknown — no Sheets link yet
    email,
    fullName: displayName,
    tier: cohort.tier,
    cohortId: cohort.id,
    createdAt: new Date(),
  };
  const docRef = await addDoc(collection(db, 'students'), newStudent);
  return { id: docRef.id, ...newStudent };
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

export async function submitAssignment({ studentId, assignment, fileName, file }) {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your .env.local file.');
  }
  
  let fileUrl = null;
  if (storage && file) {
    const storageRef = ref(storage, `submissions/${studentId}/${assignment.id}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(snapshot.ref);
  }

  const submittedAt = new Date();
  const submissionData = {
    studentId,
    assignmentId: assignment.id,
    cohortId: assignment.cohortId,
    weekNumber: assignment.weekNumber,
    fileName,
    fileUrl,
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

// --- Admin Portal Queries ---

export async function getAllCohorts() {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'cohorts'));
  return snap.docs.map(sanitizeDoc);
}

export async function unsetOldDefaultCohort() {
  if (!db) return;
  const q = query(collection(db, 'cohorts'), where('isDefault', '==', true));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await updateDoc(docSnap.ref, { isDefault: false });
  }
}

export async function createCohort(data) {
  if (!db) return null;
  if (data.isDefault) {
    await unsetOldDefaultCohort();
  }
  
  const cohortData = {
    ...data,
    createdAt: new Date()
  };
  const docRef = await addDoc(collection(db, 'cohorts'), cohortData);
  const cohortId = docRef.id;

  // Auto-create 4 placeholder assignments
  for (let i = 1; i <= (data.durationWeeks || 4); i++) {
    await addDoc(collection(db, 'assignments'), {
      cohortId,
      weekNumber: i,
      title: `Week ${i} Assignment — edit this brief`,
      brief: "Placeholder brief. Edit this to add instructions.",
      checklist: [
        { criterion: "Addresses the assignment brief's core requirement", weight: 40 },
        { criterion: "Demonstrates clear structure (intro/body/conclusion or equivalent)", weight: 20 },
        { criterion: "Professional quality — grammar, clarity, formatting", weight: 20 },
        { criterion: "Original thinking / goes beyond minimum requirements", weight: 20 }
      ],
      createdAt: new Date()
    });
  }

  return { id: cohortId, ...cohortData };
}

export async function getStudentCountForCohort(cohortId) {
  if (!db || !cohortId) return 0;
  const q = query(collection(db, 'students'), where('cohortId', '==', cohortId));
  const snap = await getDocs(q);
  return snap.size;
}

export async function getPendingSubmissionsForCohort(cohortId) {
  if (!db || !cohortId) return [];
  const q = query(
    collection(db, 'submissions'),
    where('cohortId', '==', cohortId),
    where('status', '==', 'pending_review')
  );
  const snap = await getDocs(q);
  return snap.docs.map(sanitizeDoc);
}

export async function updateAssignment(assignmentId, data) {
  if (!db || !assignmentId) return;
  const docRef = doc(db, 'assignments', assignmentId);
  await updateDoc(docRef, data);
}

export async function getSubmission(submissionId) {
  if (!db || !submissionId) return null;
  const docRef = doc(db, 'submissions', submissionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return sanitizeDoc(snap);
}

export async function updateSubmission(submissionId, data) {
  if (!db || !submissionId) return;
  const docRef = doc(db, 'submissions', submissionId);
  await updateDoc(docRef, data);
}

export async function getStudent(studentId) {
  if (!db || !studentId) return null;
  const docRef = doc(db, 'students', studentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return sanitizeDoc(snap);
}

export async function getAssignment(assignmentId) {
  if (!db || !assignmentId) return null;
  const docRef = doc(db, 'assignments', assignmentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return sanitizeDoc(snap);
}
