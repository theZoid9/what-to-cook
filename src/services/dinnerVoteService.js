import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db, friendlyFirebaseError } from './firebase';

export const FAMILY_VOTE_TARGET = 3;
export const VOTE_DURATION_SECONDS = 90;

function getTodayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getVoteSecondsLeft(endsAt) {
  if (typeof endsAt !== 'number') return 0;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function toVoteMeal(meal) {
  return { id: String(meal.id), name: String(meal.name), type: meal.type === 'side' ? 'side' : 'main' };
}

function toMillis(value) {
  return typeof value?.toMillis === 'function' ? value.toMillis() : null;
}

function normalisePoll(id, data) {
  return {
    id,
    dateKey: data.dateKey,
    main: data.main,
    side: data.side,
    endsAt: toMillis(data.endsAt)
  };
}

export async function getOrCreateTonightVote(userId, selection) {
  const currentVoteRef = doc(db, 'dinnerVoteState', 'current');
  const result = await runTransaction(db, async (transaction) => {
    const currentVote = await transaction.get(currentVoteRef);
    const currentData = currentVote.exists() ? currentVote.data() : null;
    const currentEndsAt = toMillis(currentData?.endsAt);

    if (currentData?.pollId && currentEndsAt && currentEndsAt > Date.now()) {
      const currentPoll = await transaction.get(doc(db, 'dinnerVotes', currentData.pollId));
      if (currentPoll.exists()) return normalisePoll(currentPoll.id, currentPoll.data());
    }

    const pollId = `${getTodayKey()}-${Date.now()}`;
    const endsAt = Timestamp.fromMillis(Date.now() + VOTE_DURATION_SECONDS * 1000);
    const pollRef = doc(db, 'dinnerVotes', pollId);

    const poll = {
      dateKey: pollId,
      main: toVoteMeal(selection.main),
      side: toVoteMeal(selection.side),
      createdBy: userId,
      createdAt: serverTimestamp(),
      endsAt
    };
    transaction.set(pollRef, poll);
    transaction.set(currentVoteRef, {
      pollId,
      endsAt,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    });
    return { id: pollId, dateKey: pollId, main: poll.main, side: poll.side, endsAt: endsAt.toMillis() };
  });
  return result;
}

export async function castDinnerVote(pollId, userId, choice, voterName) {
  if (choice !== 'yes' && choice !== 'no') throw new Error('Choose yes or no.');
  try {
    await setDoc(doc(db, 'dinnerVotes', pollId, 'votes', userId), {
      userId,
      choice,
      voterName: String(voterName || 'Someone').trim().slice(0, 50) || 'Someone',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

export function subscribeToDinnerVote(pollId, userId, onChange, onError) {
  let poll = null;
  let votes = [];

  function emit() {
    if (!poll) {
      onChange({ poll: null, yes: 0, no: 0, total: 0, mine: '', voters: [] });
      return;
    }
    const yes = votes.filter((vote) => vote.choice === 'yes').length;
    const no = votes.filter((vote) => vote.choice === 'no').length;
    const mine = votes.find((vote) => vote.userId === userId)?.choice || '';
    onChange({
      poll,
      yes,
      no,
      total: yes + no,
      mine,
      voters: votes.map((vote) => ({ userId: vote.userId, name: vote.voterName || 'Someone' }))
    });
  }

  const stopPoll = onSnapshot(
    doc(db, 'dinnerVotes', pollId),
    (snapshot) => {
      poll = snapshot.exists() ? normalisePoll(snapshot.id, snapshot.data()) : null;
      emit();
    },
    onError
  );
  const stopVotes = onSnapshot(
    collection(db, 'dinnerVotes', pollId, 'votes'),
    (snapshot) => {
      votes = snapshot.docs.map((vote) => vote.data());
      emit();
    },
    onError
  );

  return () => {
    stopPoll();
    stopVotes();
  };
}

export function subscribeToCurrentDinnerVote(userId, onChange, onError) {
  let activePollId = '';
  let receivedCurrent = false;
  let stopPoll = () => {};

  const stopCurrent = onSnapshot(
    doc(db, 'dinnerVoteState', 'current'),
    (snapshot) => {
      const nextPollId = snapshot.exists() ? snapshot.data().pollId : '';
      if (receivedCurrent && nextPollId === activePollId) return;
      receivedCurrent = true;
      stopPoll();
      activePollId = nextPollId || '';
      if (!activePollId) {
        onChange({ poll: null, yes: 0, no: 0, total: 0, mine: '', voters: [] });
        return;
      }
      stopPoll = subscribeToDinnerVote(activePollId, userId, onChange, onError);
    },
    onError
  );

  return () => {
    stopCurrent();
    stopPoll();
  };
}
