import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase/config';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getStudentByEmail, getOrCreateStudentByEmail } from '../mock/mockReader';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const lookupStudent = useCallback(async (email) => {
    try {
      const found = await getOrCreateStudentByEmail(email);
      setStudent(found);
      setAuthError(null);
      return found;
    } catch (err) {
      setAuthError(err.message || 'Failed to lookup student registration.');
      setStudent(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setInitialLoading(false);
      return;
    }

    let isMounted = true;

    // checkEmailLink logic has been moved to FinishSignInPage

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      if (firebaseUser?.email) {
        await lookupStudent(firebaseUser.email);
      } else {
        const savedEmail = window.localStorage.getItem('activeStudentEmail');
        if (savedEmail) {
          await lookupStudent(savedEmail);
        } else {
          setStudent(null);
        }
      }
      setInitialLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [lookupStudent]);

  const login = useCallback(async (cohortId) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (!auth) {
        throw new Error(
          'Firebase Auth is not initialized. Please check your .env.local file.'
        );
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email.toLowerCase();

      // Check allowlist
      const allowlistRef = doc(db, 'cohorts', cohortId, 'allowedEmails', email);
      const allowlistSnap = await getDoc(allowlistRef);
      if (!allowlistSnap.exists()) {
        await signOut(auth);
        setAuthError("This email isn't registered for the selected cohort.");
        return false;
      }

      const found = await getOrCreateStudentByEmail(email, cohortId);

      setStudent(found);
      window.localStorage.setItem('activeStudentEmail', found.email);
      setAuthError(null);
      return true;
    } catch (err) {
      setAuthError(err.message || 'Failed to sign in.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
    window.localStorage.removeItem('activeStudentEmail');
    setStudent(null);
    setAuthError(null);
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-thrive-ink/50">Loading…</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ student, authError, authLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
