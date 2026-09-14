import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { 
  getCohort, 
  getAssignmentsForCohort, 
  getPendingSubmissionsForCohort,
  updateAssignment 
} from '../../mock/mockReader';

export default function AdminCohortPage() {
  const { cohortId } = useParams();
  const { logout } = useAdminAuth();
  
  const [cohort, setCohort] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', brief: '', checklist: [] });

  useEffect(() => {
    async function loadData() {
      try {
        const [c, a, s] = await Promise.all([
          getCohort(cohortId),
          getAssignmentsForCohort(cohortId),
          getPendingSubmissionsForCohort(cohortId),
        ]);
        setCohort(c);
        setAssignments(a);
        setSubmissions(s);
      } catch (err) {
        console.error('Error loading cohort data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [cohortId]);

  const handleEditClick = (assignment) => {
    setEditingAssignmentId(assignment.id);
    setEditForm({ 
      title: assignment.title, 
      brief: assignment.brief,
      checklist: assignment.checklist || [
        { criterion: "Addresses the assignment brief's core requirement", weight: 40 },
        { criterion: "Demonstrates clear structure (intro/body/conclusion or equivalent)", weight: 20 },
        { criterion: "Professional quality — grammar, clarity, formatting", weight: 20 },
        { criterion: "Original thinking / goes beyond minimum requirements", weight: 20 }
      ]
    });
  };

  const handleCancelEdit = () => {
    setEditingAssignmentId(null);
    setEditForm({ title: '', brief: '', checklist: [] });
  };

  const handleSaveEdit = async (assignmentId) => {
    const totalWeight = editForm.checklist.reduce((sum, item) => sum + Number(item.weight), 0);
    if (totalWeight !== 100) {
      alert(`Checklist weights must sum to exactly 100. Current sum: ${totalWeight}`);
      return;
    }
    try {
      await updateAssignment(assignmentId, editForm);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, ...editForm } : a))
      );
      setEditingAssignmentId(null);
    } catch (err) {
      console.error('Error updating assignment:', err);
      alert('Failed to update assignment.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-thrive-sand flex items-center justify-center">
        <p className="text-sm text-thrive-ink/50">Loading cohort details...</p>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="min-h-screen bg-thrive-sand flex items-center justify-center">
        <p className="text-sm text-thrive-ink/50">Cohort not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-thrive-sand pb-12">
      <header className="bg-white border-b border-thrive-line sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-thrive-ink/60 hover:text-thrive-ink transition text-sm">
              ← Back to Dashboard
            </Link>
            <span className="text-thrive-line">|</span>
            <span className="font-display font-semibold text-lg text-thrive-ink">
              {cohort.name}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-sm font-medium text-thrive-ink/70 hover:text-thrive-ink transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 mt-8 space-y-12">
        {/* Assignments Section */}
        <section>
          <div className="mb-6">
            <h2 className="font-display text-xl font-semibold text-thrive-ink">Assignments (Weeks 1-4)</h2>
            <p className="text-sm text-thrive-ink/60 mt-1">Manage weekly assignment briefs for this cohort.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-xl border border-thrive-line p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-thrive-ink">Week {assignment.weekNumber}</h3>
                  {editingAssignmentId !== assignment.id && (
                    <button
                      onClick={() => handleEditClick(assignment)}
                      className="text-xs font-medium text-thrive-accent hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingAssignmentId === assignment.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-thrive-ink/70 mb-1">Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-thrive-line rounded-lg focus:outline-none focus:border-thrive-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-thrive-ink/70 mb-1">Brief</label>
                      <textarea
                        value={editForm.brief}
                        onChange={(e) => setEditForm({ ...editForm, brief: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-thrive-line rounded-lg focus:outline-none focus:border-thrive-accent resize-none"
                      />
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-medium text-thrive-ink/70">Checklist</label>
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({
                            ...prev, 
                            checklist: [...prev.checklist, { criterion: '', weight: 0 }]
                          }))}
                          className="text-xs font-medium text-thrive-accent hover:underline"
                        >
                          + Add Criterion
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editForm.checklist.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <input
                              type="text"
                              placeholder="Criterion"
                              value={item.criterion}
                              onChange={(e) => {
                                const newChecklist = [...editForm.checklist];
                                newChecklist[idx].criterion = e.target.value;
                                setEditForm({ ...editForm, checklist: newChecklist });
                              }}
                              className="flex-1 px-3 py-1.5 text-xs border border-thrive-line rounded focus:outline-none focus:border-thrive-accent"
                            />
                            <input
                              type="number"
                              placeholder="%"
                              value={item.weight}
                              onChange={(e) => {
                                const newChecklist = [...editForm.checklist];
                                newChecklist[idx].weight = Number(e.target.value);
                                setEditForm({ ...editForm, checklist: newChecklist });
                              }}
                              className="w-16 px-2 py-1.5 text-xs border border-thrive-line rounded focus:outline-none focus:border-thrive-accent text-right"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newChecklist = [...editForm.checklist];
                                newChecklist.splice(idx, 1);
                                setEditForm({ ...editForm, checklist: newChecklist });
                              }}
                              className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="text-right mt-1">
                        <span className={`text-xs font-medium ${
                          editForm.checklist.reduce((sum, item) => sum + Number(item.weight), 0) === 100 
                            ? 'text-thrive-sage' 
                            : 'text-red-500'
                        }`}>
                          Total Weight: {editForm.checklist.reduce((sum, item) => sum + Number(item.weight), 0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs font-medium text-thrive-ink/60 hover:text-thrive-ink"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(assignment.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-thrive-accent text-white rounded-md hover:bg-thrive-accent/90"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-thrive-ink">{assignment.title}</p>
                    <p className="text-sm text-thrive-ink/70 mt-1 line-clamp-3">{assignment.brief}</p>
                  </div>
                )}
              </div>
            ))}
            {assignments.length === 0 && (
              <p className="text-sm text-thrive-ink/50 col-span-2">No assignments found for this cohort.</p>
            )}
          </div>
        </section>

        {/* Submissions Queue Section */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-thrive-ink">Submissions Queue</h2>
              <p className="text-sm text-thrive-ink/60 mt-1">Assignments awaiting grading.</p>
            </div>
            <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">
              {submissions.length} Pending
            </span>
          </div>

          <div className="bg-white border border-thrive-line rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-thrive-ink">
              <thead className="bg-thrive-sand/50 text-thrive-ink/60 border-b border-thrive-line">
                <tr>
                  <th className="px-6 py-4 font-medium">Student ID</th>
                  <th className="px-6 py-4 font-medium">Week</th>
                  <th className="px-6 py-4 font-medium">File</th>
                  <th className="px-6 py-4 font-medium">Submitted Date</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-thrive-line">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-thrive-ink/50">
                      No pending submissions.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-thrive-sand/30 transition">
                      <td className="px-6 py-4 text-thrive-ink/70 font-mono text-xs">
                        {sub.studentId}
                      </td>
                      <td className="px-6 py-4 font-medium text-thrive-ink">
                        Week {sub.weekNumber}
                      </td>
                      <td className="px-6 py-4 text-thrive-ink/70">
                        {sub.fileName}
                      </td>
                      <td className="px-6 py-4 text-thrive-ink/70">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/admin/submissions/${sub.id}`}
                          className="inline-block px-3 py-1.5 text-xs font-medium bg-thrive-ink text-white rounded-md hover:bg-thrive-ink/90 transition"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
