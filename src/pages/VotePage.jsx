import { ChefHat, ThumbsDown, ThumbsUp, UsersRound, Vote } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Atmosphere from '../components/Atmosphere';
import Button from '../components/Button';
import Loading from '../components/Loading';
import SaveDinnerButton from '../components/SaveDinnerButton';
import VoteCountdown from '../components/VoteCountdown';
import { useAuth } from '../context/AuthContext';
import { castDinnerVote, EMPTY_VOTE_SUMMARY, FAMILY_VOTE_TARGET, subscribeToCurrentDinnerVote } from '../services/dinnerVoteService';
import { getVoteOutcome } from '../utils/voteUtils';

export default function VotePage() {
  const { user, firebaseConfigured } = useAuth();
  const [summary, setSummary] = useState(EMPTY_VOTE_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [voteEnded, setVoteEnded] = useState(false);

  useEffect(() => {
    // A person changing at the entry screen must never briefly inherit the
    // preceding person's poll, vote, or finished-result view.
    setSummary(EMPTY_VOTE_SUMMARY);
    setVoteEnded(false);
    setError('');
    setLoading(true);

    if (!user || !firebaseConfigured) {
      setLoading(false);
      return undefined;
    }
    return subscribeToCurrentDinnerVote(
      user.uid,
      (nextSummary) => {
        setSummary(nextSummary);
        setVoteEnded(Boolean(nextSummary.poll?.endsAt && nextSummary.poll.endsAt <= Date.now()));
        setLoading(false);
      },
      (voteError) => {
        setError(voteError.message || 'We could not load tonight’s vote.');
        setLoading(false);
      }
    );
  }, [user, firebaseConfigured]);

  async function vote(choice) {
    if (!user || !summary.poll || voteEnded) return;
    setSaving(true);
    setError('');
    try {
      await castDinnerVote(summary.poll.id, user.uid, choice, user.displayName);
    } catch (voteError) {
      setError(voteError.message || 'We could not save your vote.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="vote-page">
      <Atmosphere mode="still" />
      <main className="vote-page__content">
        {!firebaseConfigured ? (
          <section className="vote-page__empty"><ChefHat size={32} aria-hidden="true" /><h1>Voting is not set up yet.</h1><p>Add your Firebase settings, then return here.</p></section>
        ) : !user ? (
          <section className="vote-page__empty"><Vote size={32} aria-hidden="true" /><h1>Log in to vote.</h1><p>Every account gets one Yes or No vote and can change it at any time.</p><div className="vote-page__empty-actions"><Link className="button button--primary" to="/login">Sign in</Link></div></section>
        ) : loading ? <Loading label="Loading tonight’s vote..." /> : !summary.poll ? (
          <section className="vote-page__empty vote-page__pending"><div className="pending-spinner" aria-hidden="true" /><UsersRound size={32} aria-hidden="true" /><h1>Waiting for tonight’s meal.</h1><p>This page updates automatically when the cook starts a vote.</p></section>
        ) : voteEnded ? (
          <section className="vote-page__result" aria-live="polite">
            <p className="vote-screen__label"><Vote size={16} aria-hidden="true" /> Family vote complete</p>
            <h1>{getVoteOutcome(summary).title}</h1>
            <p className="vote-result-meal">{summary.poll.main.name} <span>with</span> {summary.poll.side.name}</p>
            <div className="vote-totals">
              <div><ThumbsUp size={20} aria-hidden="true" /><strong>{summary.yes}</strong><span>Yes</span></div>
              <div><ThumbsDown size={20} aria-hidden="true" /><strong>{summary.no}</strong><span>No</span></div>
            </div>
            <p className="vote-note">{getVoteOutcome(summary).message}</p>
            {summary.total > 0 && <SaveDinnerButton poll={summary.poll} />}
          </section>
        ) : (
          <section className="vote-page__poll" aria-live="polite">
            <p className="vote-screen__label"><UsersRound size={16} aria-hidden="true" /> Tonight’s shared meal</p>
            <h1>{summary.poll.main.name} <span>with</span> {summary.poll.side.name}</h1>
            <VoteCountdown endsAt={summary.poll.endsAt} onComplete={() => setVoteEnded(true)} />
            <p className="vote-page__question">Would you eat this tonight?</p>
            <div className="vote-actions">
              <Button className="vote-choice vote-choice--yes" onClick={() => vote('yes')} disabled={saving}><ThumbsUp size={22} aria-hidden="true" /> Yes</Button>
              <Button className="vote-choice vote-choice--no" onClick={() => vote('no')} disabled={saving}><ThumbsDown size={22} aria-hidden="true" /> No</Button>
            </div>
            <p className="vote-progress"><strong>{summary.total}</strong> of {FAMILY_VOTE_TARGET} family votes in</p>
            {summary.voters.length > 0 && <p className="vote-voters">Voted: {summary.voters.map((voter) => voter.name).join(' · ')}</p>}
            <div className="vote-totals">
              <div><ThumbsUp size={20} aria-hidden="true" /><strong>{summary.yes}</strong><span>Yes</span></div>
              <div><ThumbsDown size={20} aria-hidden="true" /><strong>{summary.no}</strong><span>No</span></div>
            </div>
            <p className="vote-note">{summary.mine ? `Your vote: ${summary.mine === 'yes' ? 'Yes' : 'No'}. You can change it whenever you like.` : 'Choose Yes or No to add your vote.'}</p>
          </section>
        )}
        {error && <p className="message message--error vote-page__error" role="alert">{error}</p>}
      </main>
    </div>
  );
}
