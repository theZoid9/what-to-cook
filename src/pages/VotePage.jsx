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

export default function VotePage() {
  const { user, firebaseConfigured, sessionRole } = useAuth();
  const [summary, setSummary] = useState(EMPTY_VOTE_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [voteEnded, setVoteEnded] = useState(false);
  const mealApproved = summary.yes > summary.no;
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
      await castDinnerVote(summary.poll.id, user.uid, choice, user.displayName);
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
            <p className="vote-note">{getVoteOutcome(summary).message}</p>
            {mealApproved ? (
              <><p className="vote-next-step">Next: save dinner to this week, then get cooking.</p><SaveDinnerButton poll={summary.poll} /></>
            ) : sessionRole === 'cook' ? (
              <div className="vote-results__actions"><p className="vote-next-step">Next: choose another dinner and start a fresh vote.</p><Link className="button button--outline" to="/">Choose another dinner</Link></div>
            ) : <p className="vote-next-step">The cook will choose another dinner shortly.</p>}
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
            <p className="vote-progress"><strong>{summary.total}</strong> {summary.total === 1 ? 'vote' : 'votes'} in</p>
            {summary.voters.length > 0 && <p className="vote-voters">Voted: {summary.voters.map((voter) => voter.name).join(' · ')}</p>}
            <div className="vote-totals">
              <div><ThumbsUp size={20} aria-hidden="true" /><strong>{summary.yes}</strong><span>Yes</span></div>
              <div><ThumbsDown size={20} aria-hidden="true" /><strong>{summary.no}</strong><span>No</span></div>
            </div>
            <p className="vote-note">{summary.mine ? `Your vote: ${summary.mine === 'yes' ? 'Yes' : 'No'}. You can change it whenever you like.` : 'Choose Yes or No to add your vote.'}</p>
            {canCancelPoll && <button className="vote-back" type="button" onClick={cancelVote} disabled={saving}>Cancel this vote</button>}
          </section>
        )}
        {error && <p className="message message--error vote-page__error" role="alert">{error}</p>}
      </main>
    </div>
  );
}
