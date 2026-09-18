import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function LoginPage() {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  
  const { login, authError, authLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    async function fetchCohorts() {
      try {
        const q = query(collection(db, 'cohorts'), orderBy('startDate', 'desc'));
        const snap = await getDocs(q);
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCohorts(loaded);
        if (loaded.length > 0) {
          setSelectedCohortId(loaded[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch cohorts:", err);
      } finally {
        setLoadingCohorts(false);
      }
    }
    fetchCohorts();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCohortId) return;
    
    const res = await login(selectedCohortId);
    if (res === true) {
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-semibold text-thrive-ink">
            Thrive VAP
          </h1>
          <p className="text-sm text-thrive-ink/60 mt-1">
            Assignment Portal
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-thrive-line p-6 shadow-sm"
        >
          <label
            htmlFor="cohort"
            className="block text-sm font-medium text-thrive-ink mb-1.5"
          >
            Select your cohort
          </label>
          <select
            id="cohort"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            disabled={loadingCohorts}
            className="w-full rounded-lg border border-thrive-line px-3.5 py-2.5
                       text-thrive-ink bg-white
                       focus:outline-none focus:ring-2 focus:ring-thrive-accent/40
                       focus:border-thrive-accent mb-4"
          >
            {loadingCohorts ? (
              <option value="">Loading cohorts...</option>
            ) : (
              cohorts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            )}
          </select>

          {authError && (
            <p className="mt-3 text-sm text-red-600 mb-3" role="alert">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading || loadingCohorts || !selectedCohortId}
            className="mt-2 w-full rounded-lg bg-thrive-accent px-4 py-2.5
                       font-medium text-white transition
                       hover:bg-thrive-accent/90 disabled:opacity-50
                       disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {authLoading ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </form>
      </div>
    </div>
  );
}
