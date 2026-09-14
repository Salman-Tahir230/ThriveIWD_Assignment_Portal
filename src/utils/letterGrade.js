const GRADE_SCALE = [
  { min: 97, letter: 'A+' }, { min: 93, letter: 'A' }, { min: 90, letter: 'A-' },
  { min: 87, letter: 'B+' }, { min: 83, letter: 'B' }, { min: 80, letter: 'B-' },
  { min: 77, letter: 'C+' }, { min: 73, letter: 'C' }, { min: 70, letter: 'C-' },
  { min: 67, letter: 'D+' }, { min: 63, letter: 'D' }, { min: 60, letter: 'D-' },
  { min: 0, letter: 'F' },
];

export function percentageToLetterGrade(percentage) {
  return (GRADE_SCALE.find((g) => percentage >= g.min) || GRADE_SCALE.at(-1)).letter;
}
