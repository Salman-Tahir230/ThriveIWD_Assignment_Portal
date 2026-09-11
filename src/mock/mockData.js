// Mock data shaped to match the real Firestore collections 1:1.
// When Firebase is wired to a live project, these objects are what
// each collection's documents should look like — swap the mock
// reader functions in src/mock/mockReader.js for real Firestore
// calls and nothing else needs to change.

// Today is treated as if the cohort started 10 days ago, so:
//   Week 1 (day 0)  -> unlocked, submitted + graded
//   Week 2 (day 7)  -> unlocked, not yet submitted
//   Week 3 (day 14) -> locked
//   Week 4 (day 21) -> locked
const DAYS_AGO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export const MOCK_COHORT_ID = 'cohort_sep2026_connect';
export const MOCK_STUDENT_ID = 'student_jane_doe';

export const mockCohorts = {
  [MOCK_COHORT_ID]: {
    id: MOCK_COHORT_ID,
    name: 'September 2026 Cohort',
    tier: 'Connect',
    startDate: DAYS_AGO(10),
    durationWeeks: 4,
  },
};

export const mockStudents = {
  [MOCK_STUDENT_ID]: {
    id: MOCK_STUDENT_ID,
    participantId: 'VAP-2026-00001', // reserved field — not used for auth today
    email: 'jane.doe@example.com',
    fullName: 'Jane Doe',
    tier: 'Connect',
    cohortId: MOCK_COHORT_ID,
    createdAt: DAYS_AGO(10),
  },
};

export const mockAssignments = {
  assignment_w1: {
    id: 'assignment_w1',
    cohortId: MOCK_COHORT_ID,
    weekNumber: 1,
    title: 'Week 1: Content Brief',
    brief:
      'Draft a one-page content brief for a Thrive IWD awareness campaign. ' +
      'Include your target audience, key message, and two content formats ' +
      'you would use to reach them.',
  },
  assignment_w2: {
    id: 'assignment_w2',
    cohortId: MOCK_COHORT_ID,
    weekNumber: 2,
    title: 'Week 2: Draft Deliverable',
    brief:
      'Produce a draft of one piece from your Week 1 brief — a social post, ' +
      'short article, or graphic concept doc. Include a short note on how it ' +
      'connects back to your target audience.',
  },
  assignment_w3: {
    id: 'assignment_w3',
    cohortId: MOCK_COHORT_ID,
    weekNumber: 3,
    title: 'Week 3: Peer Feedback Response',
    brief:
      'Revise your Week 2 deliverable based on feedback (real or anticipated). ' +
      'Submit the revised version alongside a short changelog of what shifted ' +
      'and why.',
  },
  assignment_w4: {
    id: 'assignment_w4',
    cohortId: MOCK_COHORT_ID,
    weekNumber: 4,
    title: 'Week 4: Final Signature Project',
    brief:
      'Submit your polished final piece, ready for your portfolio. Include a ' +
      'short reflection (3–5 sentences) on what you learned building it.',
  },
};

export const mockSubmissions = {
  submission_w1: {
    id: 'submission_w1',
    studentId: MOCK_STUDENT_ID,
    assignmentId: 'assignment_w1',
    cohortId: MOCK_COHORT_ID,
    weekNumber: 1,
    fileName: 'jane-doe-week1-brief.pdf',
    status: 'graded',
    score: 82,
    submittedAt: DAYS_AGO(8),
    gradedAt: DAYS_AGO(7),
  },
  // Weeks 2–4 intentionally have no submission doc yet — that
  // absence IS the "not yet submitted" state, not a separate flag.
};
