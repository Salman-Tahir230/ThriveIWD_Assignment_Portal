import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { useAdminAuth } from '../hooks/useAdminAuth'; // Adjusted to actual path

export default function ManageAdmins() {
  const { admin } = useAdminAuth();
  const [admins, setAdmins] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
      setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      const email = newEmail.trim().toLowerCase();
      if (!email) return;

      setSaving(true);
      try {
        await setDoc(doc(db, 'admins', email), {
          email,
          role: 'admin',
          addedBy: admin?.email || 'unknown',
          addedAt: Timestamp.now(),
        });
        setNewEmail('');
      } catch (err) {
        setError(err.message || 'Failed to add admin.');
      } finally {
        setSaving(false);
      }
    },
    [newEmail, admin]
  );

  const handleRemove = useCallback(
    async (email) => {
      if (email === admin?.email) {
        setError("You can't remove yourself.");
        return;
      }
      if (!window.confirm(`Remove ${email} as admin?`)) return;
      try {
        await deleteDoc(doc(db, 'admins', email));
      } catch (err) {
        setError(err.message || 'Failed to remove admin.');
      }
    },
    [admin]
  );

  return (
    <div className="bg-white rounded-2xl border border-thrive-line p-6 shadow-sm max-w-lg">
      <h2 className="font-display text-lg font-semibold text-thrive-ink mb-4">
        Manage admins
      </h2>

      <ul className="divide-y divide-thrive-line mb-5">
        {admins.map((a) => (
          <li key={a.id} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-thrive-ink">{a.email}</span>
            <button
              onClick={() => handleRemove(a.email)}
              className="text-xs text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
              disabled={a.email === admin?.email}
            >
              Remove
            </button>
          </li>
        ))}
        {admins.length === 0 && (
          <li className="py-2.5 text-sm text-thrive-ink/50">No admins yet.</li>
        )}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="newadmin@example.com"
          className="flex-1 rounded-lg border border-thrive-line px-3.5 py-2
                     text-sm text-thrive-ink placeholder:text-thrive-ink/30
                     focus:outline-none focus:ring-2 focus:ring-thrive-accent/40
                     focus:border-thrive-accent"
        />
        <button
          type="submit"
          disabled={saving || !newEmail}
          className="rounded-lg bg-thrive-accent px-4 py-2 text-sm font-medium
                     text-white hover:bg-thrive-accent/90 disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
