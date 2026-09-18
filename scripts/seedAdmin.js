import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local if present (same loader as seed.js)
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

async function seedAdmin() {
  const email = (process.argv[2] || process.env.FIRST_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();

  if (!email) {
    console.error('Usage: node scripts/seedAdmin.js you@example.com');
    process.exit(1);
  }

  console.log(`Connecting to Firestore project: ${firebaseConfig.projectId}...`);
  console.log(`Adding "${email}" to the admins collection...`);

  await setDoc(doc(db, 'admins', email), {
    email,
    role: 'admin',
    addedBy: 'seed-script',
    addedAt: Timestamp.now(),
  });

  console.log('Done — this email can now sign in to the admin panel.');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seeding failed with error:', err);
  process.exit(1);
});
