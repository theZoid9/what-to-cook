import React, { useEffect, useState } from 'react';
import { getVoteSecondsLeft } from '../services/dinnerVoteService';

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function VoteCountdown({ endsAt, onComplete }) {
  const [secondsLeft, setSecondsLeft] = useState(() => getVoteSecondsLeft(endsAt));

  useEffect(() => {
    const update = () => {
      const next = getVoteSecondsLeft(endsAt);
      setSecondsLeft(next);
      if (next === 0) onComplete?.();
      return next;
    };
    if (update() === 0) return undefined;
    const interval = window.setInterval(update, 500);
    return () => window.clearInterval(interval);
  }, [endsAt, onComplete]);

  return <p className="vote-countdown" aria-live="polite">{secondsLeft > 0 ? `Voting ends in ${formatSeconds(secondsLeft)}` : 'Voting has ended'}</p>;
}
