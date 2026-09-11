import { useState, useEffect, useCallback } from 'react';
import {
  getCohort,
  getAssignmentsForCohort,
  getSubmissionsForStudent,
} from '../mock/mockReader';
import { isWeekUnlocked, formatUnlockMessage } from '../utils/weekUnlock';

/**
 * Combines cohort start date, per-week assignments, and this
 * student's submissions into one array the dashboard can map over
 * directly — each entry already knows whether it's locked, and if
 * unlocked, whether it's awaiting submission, pending review, or
 * graded.
 *
 * Returns { weeks, loading, error, refetch }.
 * `refetch` lets the upload flow trigger a re-derive after a new
 * submission, without this hook needing to know submission internals.
 */
export function useWeekUnlock(student) {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      const cohort = await getCohort(student.cohortId);
      if (!cohort) {
        throw new Error(`No cohort found for cohortId "${student.cohortId}"`);
      }

      const [assignments, submissions] = await Promise.all([
        getAssignmentsForCohort(student.cohortId),
        getSubmissionsForStudent(student.id),
      ]);

      const submissionByWeek = new Map(
        submissions.map((s) => [s.weekNumber, s])
      );

      const derived = assignments.map((assignment) => {
        const unlocked = isWeekUnlocked(cohort.startDate, assignment.weekNumber);
        const submission = submissionByWeek.get(assignment.weekNumber) || null;

        let status;
        if (!unlocked) status = 'locked';
        else if (!submission) status = 'awaiting_submission';
        else if (submission.status === 'pending_review') status = 'pending_review';
        else status = 'graded';

        return {
          weekNumber: assignment.weekNumber,
          assignment,
          submission,
          unlocked,
          status,
          unlockMessage: unlocked
            ? null
            : formatUnlockMessage(cohort.startDate, assignment.weekNumber),
        };
      });

      setWeeks(derived);
    } catch (err) {
      setError(err.message || 'Failed to load assignment weeks.');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    load();
  }, [load]);

  const allFourGraded =
    weeks.length === 4 && weeks.every((w) => w.status === 'graded');

  return { weeks, loading, error, refetch: load, allFourGraded };
}
