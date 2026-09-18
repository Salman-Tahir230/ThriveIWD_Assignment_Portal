import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase/config';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AdminAuthContext = createContext(null);

// Looks up admins/{email} in Firestore. Returns true only if that doc exists.
// Fails closed (returns false) on any error, so a rules/network problem
// locks someone OUT of admin rather than silently letting them in.
async function checkIsAdmin(email) {
  if (!db || !email) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', email.toLowerCase()));
    return snap.exists();
  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
}

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setAdminLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email && (await checkIsAdmin(firebaseUser.email))) {
        setAdmin(firebaseUser);
      } else {
        setAdmin(null);
      }
      setAdminLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      if (!auth) {
        throw new Error('Firebase Auth is not initialized.');
      }
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const isAdmin = await checkIsAdmin(result.user.email);
      if (!isAdmin) {
        await signOut(auth);
        setAdminError('This account is not authorized as an admin.');
        setAdmin(null);
        return false;
      }

      setAdmin(result.user);
      return true;
    } catch (err) {
      setAdminError(err.message || 'Failed to sign in with Google.');
      return false;
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error signing out admin:', err);
      }
    }
    setAdmin(null);
    setAdminError(null);
  }, []);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading Admin...</p>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider
      value={{ admin, adminLoading, adminError, loginWithGoogle, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
