import { ChefHat, ThumbsDown, ThumbsUp, UsersRound, Vote } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Atmosphere from '../components/Atmosphere';
import Button from '../components/Button';
import Loading from '../components/Loading';
import SaveDinnerButton from '../components/SaveDinnerButton';
import VoteCountdown from '../components/VoteCountdown';
import { useAuth } from '../context/AuthContext';
import { cancelCurrentDinnerVote, castDinnerVote, COOK_HEARTBEAT_MS, EMPTY_VOTE_SUMMARY, keepCurrentVoteAlive, subscribeToCurrentDinnerVote } from '../services/dinnerVoteService';
import { getVoteOutcome } from '../utils/voteUtils';

function VoterList({ voters }) {
  if (!voters.length) return null;
  return <ul className="vote-voters" aria-label="Votes received">
    {voters.map((voter) => <li key={voter.userId}>
      <strong>{voter.name}</strong>
      <span className={voter.choice === 'yes' ? 'vote-voters__yes' : 'vote-voters__no'}>{voter.choice === 'yes' ? 'Yes' : 'No'}</span>
      {voter.comment && <em>{voter.comment}</em>}
    </li>)}
  </ul>;
}

export default function VotePage() {
  const { user, firebaseConfigured, sessionRole } = useAuth();
  const [summary, setSummary] = useState(EMPTY_VOTE_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [voteEnded, setVoteEnded] = useState(false);
  const [comment, setComment] = useState('');
  const mealApproved = summary.yes > summary.no;
  const isCook = sessionRole === 'cook';
  const canCancelPoll = sessionRole === 'cook' && summary.poll?.createdBy === user?.uid;

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

  // The cook is on this shared page too. Keep the vote alive while they are
  // here, so voters only return to the waiting state when the cook truly leaves.
  useEffect(() => {
    if (!user || !canCancelPoll || voteEnded) return undefined;

    const reportPresence = () => keepCurrentVoteAlive(user.uid).catch(() => {});
    reportPresence();
    const heartbeat = window.setInterval(reportPresence, COOK_HEARTBEAT_MS);
    return () => window.clearInterval(heartbeat);
  }, [user?.uid, canCancelPoll, summary.poll?.id, voteEnded]);

  async function vote(choice) {
    if (!user || !summary.poll || voteEnded) return;
    setSaving(true);
    setError('');
    try {
      await castDinnerVote(summary.poll.id, user.uid, choice, user.displayName, comment);
      setComment('');
    } catch (voteError) {
      setError(voteError.message || 'We could not save your vote.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelVote() {
    if (!user || !summary.poll || !canCancelPoll) return;
    setSaving(true);
    setError('');
    try {
      await cancelCurrentDinnerVote(user.uid, summary.poll.id);
    } catch (cancelError) {
      setError(cancelError.message || 'We could not cancel tonight’s vote.');
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
          <section className="vote-page__empty vote-page__pending"><div className="pending-spinner" aria-hidden="true" /><UsersRound size={32} aria-hidden="true" /><h1>Waiting for the cook to pick dinner.</h1><p>This page updates automatically when a vote starts.</p></section>
        ) : voteEnded ? (
          <section className="vote-page__result" aria-live="polite">
            <p className="vote-screen__label"><Vote size={16} aria-hidden="true" /> Vote complete</p>
            <h1>{getVoteOutcome(summary).title}</h1>
            <p className="vote-result-meal">{summary.poll.main.name} <span>with</span> {summary.poll.side.name}</p>
            <div className="vote-totals">
              <div><ThumbsUp size={20} aria-hidden="true" /><strong>{summary.yes}</strong><span>Yes</span></div>
              <div><ThumbsDown size={20} aria-hidden="true" /><strong>{summary.no}</strong><span>No</span></div>
            </div>
            <VoterList voters={summary.voters} />
            <p className="vote-note">{getVoteOutcome(summary).message}</p>
            {mealApproved && canCancelPoll ? (
              <>
                <p className="vote-next-step">Next: save dinner to this week, then get cooking.</p>
                <SaveDinnerButton poll={summary.poll} />
                <Link className="button button--outline vote-complete-home" to="/">Back to dinner picker</Link>
              </>
            ) : !mealApproved && canCancelPoll ? (
              <div className="vote-results__actions"><p className="vote-next-step">Next: choose another dinner and start a fresh vote.</p><Link className="button button--outline" to="/">Back to dinner picker</Link></div>
            ) : <p className="vote-next-step">The cook will save the meal or choose another dinner shortly.</p>}
          </section>
        ) : (
          <section className="vote-page__poll" aria-live="polite">
            <p className="vote-screen__label"><UsersRound size={16} aria-hidden="true" /> Tonight’s shared meal</p>
            <h1>{summary.poll.main.name} <span>with</span> {summary.poll.side.name}</h1>
            <VoteCountdown endsAt={summary.poll.endsAt} onComplete={() => setVoteEnded(true)} />
            {isCook ? (
              <p className="vote-page__question">Vote is open. Watch responses come in below.</p>
            ) : (
              <>
                <p className="vote-page__question">Would you eat this tonight?</p>
                <label className="vote-comment" htmlFor="vote-comment">
                  <span>Comment <em>optional</em></span>
                  <textarea id="vote-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength="240" placeholder="e.g. I’ll be home late" />
                </label>
                <div className="vote-actions">
                  <Button className="vote-choice vote-choice--yes" onClick={() => vote('yes')} disabled={saving}><ThumbsUp size={22} aria-hidden="true" /> Yes</Button>
                  <Button className="vote-choice vote-choice--no" onClick={() => vote('no')} disabled={saving}><ThumbsDown size={22} aria-hidden="true" /> No</Button>
                </div>
              </>
            )}
            <p className="vote-progress"><strong>{summary.total}</strong> {summary.total === 1 ? 'vote' : 'votes'} in</p>
            <VoterList voters={summary.voters} />
            <div className="vote-totals">
              <div><ThumbsUp size={20} aria-hidden="true" /><strong>{summary.yes}</strong><span>Yes</span></div>
              <div><ThumbsDown size={20} aria-hidden="true" /><strong>{summary.no}</strong><span>No</span></div>
            </div>
            <p className="vote-note">{isCook ? 'The cook does not vote. These totals update as people respond.' : summary.mine ? `Your vote: ${summary.mine === 'yes' ? 'Yes' : 'No'}. You can change it whenever you like.` : 'Choose Yes or No to add your vote.'}</p>
            {canCancelPoll && <button className="vote-back" type="button" onClick={cancelVote} disabled={saving}>Cancel this vote</button>}
          </section>
        )}
        {error && <p className="message message--error vote-page__error" role="alert">{error}</p>}
      </main>
    </div>
  );
}
