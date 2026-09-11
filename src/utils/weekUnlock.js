// Pure function: given a cohort start date and a week number (1-4),
// returns whether that week is unlocked as of "now". Kept separate
// from any data-fetching so it's trivial to unit test and reuse
// (e.g. an admin preview of "what would week 3 look like on date X"
// in phase 2 just calls this with a different `now`).

/**
 * @param {Date} cohortStartDate
 * @param {number} weekNumber - 1 through 4
 * @param {Date} [now] - defaults to current time; injectable for testing
 * @returns {boolean}
 */
export function isWeekUnlocked(cohortStartDate, weekNumber, now = new Date()) {
  const unlockDate = new Date(cohortStartDate);
  unlockDate.setDate(unlockDate.getDate() + (weekNumber - 1) * 7);
  return now >= unlockDate;
}

/**
 * Returns the unlock date for a given week, without checking against "now".
 * Used to render "Unlocks in 3 days" style messaging on locked weeks.
 */
export function getWeekUnlockDate(cohortStartDate, weekNumber) {
  const unlockDate = new Date(cohortStartDate);
  unlockDate.setDate(unlockDate.getDate() + (weekNumber - 1) * 7);
  return unlockDate;
}

/**
 * Human-readable "unlocks in N days" / "unlocked M days ago" string,
 * for locked-week messaging on the dashboard.
 */
export function formatUnlockMessage(cohortStartDate, weekNumber, now = new Date()) {
  const unlockDate = getWeekUnlockDate(cohortStartDate, weekNumber);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = Math.ceil((unlockDate - now) / msPerDay);

  if (daysUntil <= 0) return null; // already unlocked — no message needed
  if (daysUntil === 1) return 'Unlocks tomorrow';
  return `Unlocks in ${daysUntil} days`;
}
