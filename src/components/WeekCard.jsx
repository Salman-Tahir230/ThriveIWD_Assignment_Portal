import { useState } from 'react';
import { submitAssignment, mockGradeSubmission } from '../mock/mockReader';
import { percentageToLetterGrade } from '../utils/letterGrade';

const ACCEPTED_TYPES = ['.pdf', '.docx'];

function FileUploadForm({ assignment, studentId, onSubmitted }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    const ext = '.' + selected.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      setError('Only PDF and DOCX files are accepted.');
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    try {
      const submission = await submitAssignment({
        studentId,
        assignment,
        fileName: file.name,
        file,
      });
      onSubmitted(submission);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label
        htmlFor={`file-${assignment.id}`}
        className="flex flex-col items-center justify-center gap-1.5
                   rounded-xl border-2 border-dashed border-thrive-line
                   bg-thrive-sand/60 px-4 py-6 text-center cursor-pointer
                   hover:border-thrive-accent/50 transition"
      >
        <span className="text-sm font-medium text-thrive-ink">
          {file ? file.name : 'Click to choose a file'}
        </span>
        <span className="text-xs text-thrive-ink/50">PDF or DOCX only</span>
        <input
          id={`file-${assignment.id}`}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!file || submitting}
        className="mt-3 w-full rounded-lg bg-thrive-accent px-4 py-2
                   font-medium text-white transition hover:bg-thrive-accent/90
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting…' : 'Submit assignment'}
      </button>
    </form>
  );
}

export default function WeekCard({ week, studentId, onSubmitted }) {
  const { weekNumber, assignment, submission, status, unlockMessage } = week;

  const statusPill = {
    locked: { label: 'Locked', cls: 'bg-thrive-ink/5 text-thrive-ink/40' },
    awaiting_submission: {
      label: 'Ready for you',
      cls: 'bg-thrive-accent/10 text-thrive-accent',
    },
    pending_review: {
      label: 'Pending review',
      cls: 'bg-amber-100 text-amber-700',
    },
    graded: { label: 'Graded', cls: 'bg-thrive-sage/15 text-thrive-sage' },
  }[status];

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        status === 'locked'
          ? 'border-thrive-line bg-white/50 opacity-60'
          : 'border-thrive-line bg-white shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-thrive-ink">
          Week {weekNumber}
        </h3>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusPill.cls}`}
        >
          {statusPill.label}
        </span>
      </div>

      {status === 'locked' ? (
        <p className="mt-2 text-sm text-thrive-ink/50">
          {assignment.title} · {unlockMessage}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium text-thrive-ink">
            {assignment.title}
          </p>
          <p className="mt-1.5 text-sm text-thrive-ink/70 leading-relaxed">
            {assignment.brief}
          </p>

          {status === 'awaiting_submission' && (
            <FileUploadForm
              assignment={assignment}
              studentId={studentId}
              onSubmitted={onSubmitted}
            />
          )}

          {status === 'pending_review' && (
            <div className="mt-4 rounded-lg bg-thrive-sand px-4 py-3">
              <p className="text-sm text-thrive-ink/70">
                Submitted: <span className="font-medium">{submission.fileName}</span>
              </p>
              <p className="mt-1 text-xs text-thrive-ink/50">
                Awaiting review — check back soon.
              </p>
              <button
                onClick={async () => {
                  await mockGradeSubmission(submission.id, 75);
                  onSubmitted(submission);
                }}
                className="mt-3 text-xs font-medium text-thrive-accent/70
                           hover:text-thrive-accent underline decoration-dotted"
              >
                [Demo only] Simulate grading →
              </button>
            </div>
          )}

          {status === 'graded' && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-thrive-sage/10 px-4 py-3">
              <span className="text-sm text-thrive-ink/70">
                {submission.fileName}
              </span>
              <span className="font-display text-lg font-semibold text-thrive-sage">
                {submission.score}% &middot; {percentageToLetterGrade(submission.score)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
