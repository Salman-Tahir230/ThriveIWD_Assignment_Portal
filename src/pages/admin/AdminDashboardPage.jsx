import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getAllCohorts, getStudentCountForCohort, createCohort } from '../../mock/mockReader';
import ManageAdmins from '../../components/ManageAdmins';

export default function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    tier: 'Flex',
    startDate: '',
    durationWeeks: 4,
    isDefault: false
  });
  const [creating, setCreating] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const fetchedCohorts = await getAllCohorts();
      const cohortsWithCounts = await Promise.all(
        fetchedCohorts.map(async (cohort) => {
          const count = await getStudentCountForCohort(cohort.id);
          return { ...cohort, studentCount: count };
        })
      );
      setCohorts(cohortsWithCounts);
    } catch (err) {
      console.error('Error loading cohorts:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCohort = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createCohort({
        ...createForm,
        durationWeeks: Number(createForm.durationWeeks)
      });
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        tier: 'Flex',
        startDate: '',
        durationWeeks: 4,
        isDefault: false
      });
      await loadData();
    } catch (err) {
      console.error('Error creating cohort:', err);
      alert('Failed to create cohort.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-thrive-sand pb-12">
      <header className="bg-white border-b border-thrive-line sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display font-semibold text-lg text-thrive-ink">
              Admin Portal
            </span>
            <span className="text-sm px-2 py-0.5 bg-thrive-accent/10 text-thrive-accent rounded-md font-medium">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
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

      <main className="mx-auto max-w-5xl px-6 mt-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-thrive-ink">Cohorts</h1>
            <p className="text-thrive-ink/60 mt-1">Manage cohorts, assignments, and grade submissions.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin/upload-emails"
              className="px-4 py-2 bg-thrive-ink text-white font-medium rounded-lg hover:bg-thrive-ink/90 transition"
            >
              Upload Emails
            </Link>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-thrive-accent text-white font-medium rounded-lg hover:bg-thrive-accent/90 transition"
            >
              + New Cohort
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="mb-8 p-6 bg-white border border-thrive-line rounded-xl shadow-sm">
            <h2 className="font-display text-lg font-semibold text-thrive-ink mb-4">Create New Cohort</h2>
            <form onSubmit={handleCreateCohort} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-thrive-ink mb-1">Cohort Name</label>
                  <input
                    required
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-thrive-line rounded-lg focus:outline-none focus:border-thrive-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-thrive-ink mb-1">Tier</label>
                  <select
                    value={createForm.tier}
                    onChange={e => setCreateForm(prev => ({ ...prev, tier: e.target.value }))}
                    className="w-full px-3 py-2 border border-thrive-line rounded-lg focus:outline-none focus:border-thrive-accent"
                  >
                    <option value="Flex">Flex</option>
                    <option value="Connect">Connect</option>
                    <option value="Live">Live</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-thrive-ink mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={createForm.startDate}
                    onChange={e => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-thrive-line rounded-lg focus:outline-none focus:border-thrive-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-thrive-ink mb-1">Duration (Weeks)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={createForm.durationWeeks}
                    onChange={e => setCreateForm(prev => ({ ...prev, durationWeeks: e.target.value }))}
                    className="w-full px-3 py-2 border border-thrive-line rounded-lg focus:outline-none focus:border-thrive-accent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={createForm.isDefault}
                  onChange={e => setCreateForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded border-thrive-line text-thrive-accent focus:ring-thrive-accent"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-thrive-ink">
                  Set as default cohort
                </label>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 font-medium text-thrive-ink/70 hover:text-thrive-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-thrive-ink text-white font-medium rounded-lg hover:bg-thrive-ink/90 transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Cohort'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-thrive-ink/50">Loading cohorts...</p>
          </div>
        ) : (
          <div className="bg-white border border-thrive-line rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-thrive-ink">
              <thead className="bg-thrive-sand/50 text-thrive-ink/60 border-b border-thrive-line">
                <tr>
                  <th className="px-6 py-4 font-medium">Cohort Name</th>
                  <th className="px-6 py-4 font-medium">Tier</th>
                  <th className="px-6 py-4 font-medium">Start Date</th>
                  <th className="px-6 py-4 font-medium">Students</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-thrive-line">
                {cohorts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-thrive-ink/50">
                      No cohorts found.
                    </td>
                  </tr>
                ) : (
                  cohorts.map((cohort) => (
                    <tr key={cohort.id} className="hover:bg-thrive-sand/30 transition">
                      <td className="px-6 py-4 font-medium text-thrive-ink">
                        {cohort.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-thrive-ink/5 text-thrive-ink/70 capitalize">
                          {cohort.tier || 'Standard'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-thrive-ink/70">
                        {cohort.startDate ? new Date(cohort.startDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {cohort.studentCount}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/admin/cohorts/${cohort.id}`}
                          className="text-thrive-accent font-medium hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-12">
          <ManageAdmins />
        </div>
      </main>
    </div>
  );
}
