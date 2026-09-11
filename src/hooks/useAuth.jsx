import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase/config';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { getStudentByEmail } from '../mock/mockReader';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const lookupStudent = useCallback(async (email) => {
    try {
      const found = await getStudentByEmail(email);
      if (!found) {
        setAuthError(
          "We couldn't find a registration for that email. Double-check " +
            'the address you used to sign up, or contact info@thriveiwd.com.'
        );
        setStudent(null);
        if (auth && auth.currentUser) {
          await signOut(auth);
        }
        return null;
      }
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

    const checkEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setAuthLoading(true);
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            const res = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            if (isMounted) {
              await lookupStudent(res.user?.email || email);
            }
          } catch (err) {
            if (isMounted) {
              setAuthError(err.message || 'Failed to sign in with email link.');
              setStudent(null);
            }
          }
        }
        if (isMounted) {
          setAuthLoading(false);
          setInitialLoading(false);
        }
      }
    };

    checkEmailLink();

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

  const login = useCallback(async (email) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (!auth) {
        throw new Error(
          'Firebase Auth is not initialized. Please check your .env.local file.'
        );
      }
      // Validate that student registration exists before sending sign-in link
      const found = await getStudentByEmail(email);
      if (!found) {
        setAuthError(
          "We couldn't find a registration for that email. Double-check " +
            'the address you used to sign up, or contact info@thriveiwd.com.'
        );
        return false;
      }

      try {
        const actionCodeSettings = {
          url: window.location.origin + '/',
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        setAuthError('Sign-in link sent! Please check your email to sign in.');
        return false;
      } catch (sendErr) {
        // If Firebase free tier daily email quota is exceeded, sign in directly with the verified student doc
        if (
          sendErr.code === 'auth/quota-exceeded' ||
          sendErr.message?.includes('quota-exceeded')
        ) {
          setStudent(found);
          window.localStorage.setItem('activeStudentEmail', found.email);
          setAuthError(null);
          return true;
        }
        throw sendErr;
      }
    } catch (err) {
      setAuthError(err.message || 'Failed to send sign-in link.');
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
