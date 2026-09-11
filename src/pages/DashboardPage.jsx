import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWeekUnlock } from '../hooks/useWeekUnlock';
import WeekCard from '../components/WeekCard';

export default function DashboardPage() {
  const { student, logout } = useAuth();
  const { weeks, loading, error, refetch, allFourGraded } =
    useWeekUnlock(student);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-thrive-accent">
              {student?.tier} Tier
            </p>
            <h1 className="font-display text-2xl font-semibold text-thrive-ink">
              Welcome, {student?.fullName?.split(' ')[0]}
            </h1>
          </div>
          <button
            onClick={logout}
            className="text-sm text-thrive-ink/50 hover:text-thrive-ink transition"
          >
            Sign out
          </button>
        </header>

        {loading && (
          <p className="text-sm text-thrive-ink/50">Loading your weeks…</p>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {weeks.map((week) => (
              <WeekCard
                key={week.weekNumber}
                week={week}
                studentId={student.id}
                onSubmitted={refetch}
              />
            ))}
          </div>
        )}

        {allFourGraded && (
          <div className="mt-8 rounded-2xl border border-thrive-accent/30 bg-thrive-accent/5 p-6 text-center">
            <p className="font-display text-lg font-semibold text-thrive-ink">
              You've completed all four weeks!
            </p>
            <p className="mt-1 text-sm text-thrive-ink/60">
              Your certificate is ready to collect.
            </p>
            <button
              onClick={() => navigate('/certificate')}
              className="mt-4 rounded-lg bg-thrive-accent px-5 py-2.5
                         font-medium text-white hover:bg-thrive-accent/90 transition"
            >
              Collect your certificate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
