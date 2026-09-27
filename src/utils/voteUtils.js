export function getVoteOutcome({ yes, no, total }) {
  if (!total) return { title: 'No votes came in.', message: 'No problem — spin another dinner and try again.' };
  if (yes > no) return { title: 'It’s a yes.', message: 'Dinner is decided. Time to get cooking.' };
  if (no > yes) return { title: 'Not tonight.', message: 'The no votes won. Spin another dinner.' };
  return { title: 'It’s a tie.', message: 'No winner this time. Spin another dinner.' };
}
