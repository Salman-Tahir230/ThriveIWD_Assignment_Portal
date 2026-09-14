
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';

export default function FinishSignInPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // We just need lookupStudent logic from AuthProvider, but useAuth handles auth state.
  // We don't want to use lookupStudent directly here because it might cause cyclic dependency if we export it.
  // Actually, the checkEmailLink was in useAuth, so after signInWithEmailLink, onAuthStateChanged in useAuth will fire,
  // which will then lookup the student and update the context.
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    async function completeSignIn() {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            // The AuthProvider's onAuthStateChanged will handle lookupStudent.
            // Just navigate to dashboard.
            navigate('/', { replace: true });
          } catch (err) {
            setError(err.message || 'Failed to sign in with email link.');
            setLoading(false);
          }
        } else {
          setError('Email is required to complete sign in.');
          setLoading(false);
        }
      } else {
        // Not a valid sign in link
        navigate('/', { replace: true });
      }
    }

    completeSignIn();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-thrive-accent hover:underline"
        >
          Return to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-thrive-ink/60">Completing your sign in...</p>
    </div>
  );
}
