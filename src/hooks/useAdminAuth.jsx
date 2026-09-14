import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setAdminLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      
      if (firebaseUser?.email === adminEmail) {
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
      
      if (result.user.email !== import.meta.env.VITE_ADMIN_EMAIL) {
        await signOut(auth);
        setAdminError("This account is not authorized as an admin.");
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
    <AdminAuthContext.Provider value={{ admin, adminLoading, adminError, loginWithGoogle, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
