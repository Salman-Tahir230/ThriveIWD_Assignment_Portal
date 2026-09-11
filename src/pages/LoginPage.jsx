import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const { login, authError, authLoading } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await login(email.trim());
    if (ok) navigate('/');
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
            htmlFor="email"
            className="block text-sm font-medium text-thrive-ink mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-thrive-line px-3.5 py-2.5
                       text-thrive-ink placeholder:text-thrive-ink/30
                       focus:outline-none focus:ring-2 focus:ring-thrive-accent/40
                       focus:border-thrive-accent"
          />

          {authError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading || !email}
            className="mt-5 w-full rounded-lg bg-thrive-accent px-4 py-2.5
                       font-medium text-white transition
                       hover:bg-thrive-accent/90 disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            {authLoading ? 'Checking…' : 'Continue'}
          </button>

          <p className="mt-4 text-xs text-thrive-ink/50 text-center">
            Use the email address you registered with. In the live version,
            this sends a sign-in link — today it signs you in directly for
            demo purposes.
          </p>
        </form>
      </div>
    </div>
  );
}
