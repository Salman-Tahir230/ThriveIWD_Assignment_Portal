import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local if present
function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    'Error: Firebase config is missing (.env.local not found or incomplete).\n' +
      'Please create a .env.local file with your Firebase web app credentials.'
  );
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log(`Connecting to Firestore project: ${firebaseConfig.projectId}...`);

  const cohortId = 'cohort_sep2026_connect';
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  // 1. One real test cohort
  console.log(`Seeding cohort "${cohortId}"...`);
  await setDoc(doc(db, 'cohorts', cohortId), {
    name: 'September 2026 Cohort',
    tier: 'Connect',
    startDate: Timestamp.fromDate(tenDaysAgo),
    durationWeeks: 4,
  });

  // 2. One test student
  const studentId = 'student_jane_doe';
  const studentEmail = (
    process.argv[2] ||
    process.env.TEST_STUDENT_EMAIL ||
    'jane.doe@example.com'
  )
    .trim()
    .toLowerCase();

  console.log(`Seeding student "${studentId}" with email "${studentEmail}"...`);
  await setDoc(doc(db, 'students', studentId), {
    participantId: 'VAP-2026-00001',
    email: studentEmail,
    fullName: 'Jane Doe',
    tier: 'Connect',
    cohortId: cohortId,
    createdAt: Timestamp.fromDate(tenDaysAgo),
  });

  // 3. Four assignments (Week 1–4, reusing mock brief text verbatim)
  const assignments = [
    {
      id: 'assignment_w1',
      cohortId: cohortId,
      weekNumber: 1,
      title: 'Week 1: Content Brief',
      brief:
        'Draft a one-page content brief for a Thrive IWD awareness campaign. ' +
        'Include your target audience, key message, and two content formats ' +
        'you would use to reach them.',
    },
    {
      id: 'assignment_w2',
      cohortId: cohortId,
      weekNumber: 2,
      title: 'Week 2: Draft Deliverable',
      brief:
        'Produce a draft of one piece from your Week 1 brief — a social post, ' +
        'short article, or graphic concept doc. Include a short note on how it ' +
        'connects back to your target audience.',
    },
    {
      id: 'assignment_w3',
      cohortId: cohortId,
      weekNumber: 3,
      title: 'Week 3: Peer Feedback Response',
      brief:
        'Revise your Week 2 deliverable based on feedback (real or anticipated). ' +
        'Submit the revised version alongside a short changelog of what shifted ' +
        'and why.',
    },
    {
      id: 'assignment_w4',
      cohortId: cohortId,
      weekNumber: 4,
      title: 'Week 4: Final Signature Project',
      brief:
        'Submit your polished final piece, ready for your portfolio. Include a ' +
        'short reflection (3–5 sentences) on what you learned building it.',
    },
  ];

  console.log('Seeding 4 assignments (Weeks 1 to 4)...');
  for (const a of assignments) {
    const { id, ...data } = a;
    await setDoc(doc(db, 'assignments', id), data);
  }

  console.log('\nSeeding complete! Successfully inserted:');
  console.log(`- 1 cohort: ${cohortId}`);
  console.log(`- 1 student: ${studentEmail} (${studentId})`);
  console.log(`- 4 assignments: Weeks 1-4`);
  console.log('- 0 submissions (portal starts in a fresh unsubmitted state)\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed with error:', err);
  process.exit(1);
});
