import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  Timestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Link } from 'react-router-dom';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(text) {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map((e) => e.toLowerCase()))];
}

export default function AdminUploadEmailsPage() {
  const { admin, logout } = useAdminAuth();
  const [cohorts, setCohorts] = useState([]);
  const [cohortId, setCohortId] = useState('');
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) return;
    (async () => {
      const snap = await getDocs(
        query(collection(db, 'cohorts'), orderBy('startDate', 'desc'))
      );
      setCohorts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  const emails = extractEmails(rawText);

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawText(String(reader.result || ''));
    reader.readAsText(file);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      setResult(null);

      if (!cohortId) {
        setError('Pick a cohort first.');
        return;
      }
      if (emails.length === 0) {
        setError('No valid emails found in the text/file.');
        return;
      }

      setSaving(true);
      try {
        const chunkSize = 450;
        for (let i = 0; i < emails.length; i += chunkSize) {
          const batch = writeBatch(db);
          const chunk = emails.slice(i, i + chunkSize);
          for (const email of chunk) {
            batch.set(doc(db, 'cohorts', cohortId, 'allowedEmails', email), {
              email,
              addedAt: Timestamp.now(),
            });
          }
          await batch.commit();
        }
        setResult(`${emails.length} email(s) added to this cohort.`);
        setRawText('');
      } catch (err) {
        setError(err.message || 'Upload failed.');
      } finally {
        setSaving(false);
      }
    },
    [cohortId, emails]
  );

  return (
    <div className="min-h-screen bg-thrive-sand pb-12">
      <header className="bg-white border-b border-thrive-line sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display font-semibold text-lg text-thrive-ink">
              Admin Portal
            </span>
            <span className="text-sm px-2 py-0.5 bg-thrive-accent/10 text-thrive-accent rounded-md font-medium">
              Upload Emails
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-sm font-medium text-thrive-accent hover:underline transition">
              Back to Dashboard
            </Link>
            <span className="text-sm text-thrive-ink/60">{admin?.email}</span>
            <button
              onClick={logout}
              className="text-sm font-medium text-thrive-ink/70 hover:text-thrive-ink transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 mt-8 flex justify-center">
        <div className="bg-white rounded-2xl border border-thrive-line p-6 shadow-sm w-full max-w-lg mt-8">
          <h2 className="font-display text-lg font-semibold text-thrive-ink mb-4">
            Upload cohort emails
          </h2>

          <label className="block text-sm font-medium text-thrive-ink mb-1.5">
            Cohort
          </label>
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="w-full rounded-lg border border-thrive-line px-3.5 py-2.5 mb-4
                       text-thrive-ink focus:outline-none focus:ring-2
                       focus:ring-thrive-accent/40 focus:border-thrive-accent"
          >
            <option value="">Select a cohort…</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium text-thrive-ink mb-1.5">
            Emails — upload a file or paste below
          </label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            className="mb-2 text-sm text-thrive-ink/70"
          />
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            placeholder="one email per line, or paste a CSV export — extra columns are ignored"
            className="w-full rounded-lg border border-thrive-line px-3.5 py-2.5
                       text-sm text-thrive-ink placeholder:text-thrive-ink/30
                       focus:outline-none focus:ring-2 focus:ring-thrive-accent/40
                       focus:border-thrive-accent"
          />
          <p className="mt-1.5 text-xs text-thrive-ink/50">
            {emails.length} valid email{emails.length === 1 ? '' : 's'} detected
          </p>

          <button
            onClick={handleSubmit}
            disabled={saving || !cohortId || emails.length === 0}
            className="mt-4 w-full rounded-lg bg-thrive-accent px-4 py-2.5
                       font-medium text-white hover:bg-thrive-accent/90
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Uploading…' : `Add ${emails.length || ''} email(s) to cohort`}
          </button>

          {result && (
            <p className="mt-3 text-sm text-green-700" role="status">
              {result}
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
