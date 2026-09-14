// Firebase project config. Points at a real project as of the values
// in .env.local — see that file (git-ignored, not committed) for the
// actual credentials. This file no longer needs editing to go live;
// it already is live, gated only by whether .env.local exists.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app;
let auth;
let db;
let storage;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // No .env.local present — this is the expected state for anyone
  // running the mock-data build without Firebase credentials. Don't
  // throw here; just leave auth/db undefined so any real-Firestore
  // code that isn't reached yet (mockReader.js is still in use as of
  // this commit) never gets called with a missing db.
  console.warn(
    'Firebase config is missing (.env.local not found or incomplete). ' +
      'Running without a live Firebase connection.'
  );
}

export { app, auth, db, storage };
export default firebaseConfig;
