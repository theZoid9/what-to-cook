import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db, friendlyFirebaseError } from './firebase';

export const VOTE_DURATION_SECONDS = 30;
export const COOK_HEARTBEAT_MS = 2500;
export const COOK_PRESENCE_TIMEOUT_MS = 8000;
export const EMPTY_VOTE_SUMMARY = Object.freeze({ poll: null, yes: 0, no: 0, total: 0, mine: '', voters: [] });

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

function isStillOpen(endsAt) {
  return typeof endsAt === 'number' && endsAt > Date.now();
}

function normalisePoll(id, data) {
  return {
    id,
    dateKey: data.dateKey,
    createdBy: data.createdBy,
    main: data.main,
    side: data.side,
    endsAt: toMillis(data.endsAt)
  };
}

export function startTonightVote(userId, selection) {
  const currentVoteRef = doc(db, 'dinnerVoteState', 'current');
  // Starting a vote is two independent writes. A batch keeps them atomic
  // without a transaction retrying against the cook's presence heartbeat.
  const pollId = `${getTodayKey()}-${Date.now()}`;
  const endsAt = Timestamp.fromMillis(Date.now() + VOTE_DURATION_SECONDS * 1000);
  const poll = {
    dateKey: pollId,
    main: toVoteMeal(selection.main),
    side: toVoteMeal(selection.side),
    createdBy: userId,
    createdAt: serverTimestamp(),
    endsAt
  };
  const batch = writeBatch(db);
  batch.set(doc(db, 'dinnerVotes', pollId), poll);
  batch.set(currentVoteRef, {
    pollId,
    endsAt,
    ownerId: userId,
    ownerLastActiveAt: Timestamp.fromMillis(Date.now()),
    updatedBy: userId,
    updatedAt: serverTimestamp()
  });

  return {
    poll: { id: pollId, dateKey: pollId, main: poll.main, side: poll.side, endsAt: endsAt.toMillis() },
    commit: batch.commit().catch((error) => {
      throw new Error(friendlyFirebaseError(error));
    })
  };
}

export async function keepCurrentVoteAlive(userId) {
  try {
    await updateDoc(doc(db, 'dinnerVoteState', 'current'), {
      // `serverTimestamp()` is temporarily null in Firestore's local
      // snapshot. The listener reads this field to decide whether the cook is
      // still here, so using a concrete value prevents the vote from briefly
      // falling back to the waiting screen on every heartbeat.
      ownerLastActiveAt: Timestamp.fromMillis(Date.now()),
      updatedBy: userId,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

export async function cancelCurrentDinnerVote(userId, pollId) {
  const currentVoteRef = doc(db, 'dinnerVoteState', 'current');
  try {
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(currentVoteRef);
      if (!current.exists() || current.data().pollId !== pollId || current.data().ownerId !== userId) return;
      transaction.update(currentVoteRef, {
        pollId: '',
        endsAt: Timestamp.fromMillis(0),
        ownerLastActiveAt: Timestamp.fromMillis(0),
        updatedBy: userId,
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
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
      onChange(EMPTY_VOTE_SUMMARY);
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
  let ownerTimer = null;

  function stopActivePoll() {
    stopPoll();
    stopPoll = () => {};
    activePollId = '';
  }

  function clearOwnerTimer() {
    if (ownerTimer) window.clearTimeout(ownerTimer);
    ownerTimer = null;
  }

  function scheduleOwnerTimeout(ownerLastActiveAt, endsAt) {
    clearOwnerTimer();
    const lastSeen = toMillis(ownerLastActiveAt);
    const cookMissingAt = (lastSeen || 0) + COOK_PRESENCE_TIMEOUT_MS;
    const timeoutAt = Math.min(cookMissingAt, endsAt || 0);
    const remaining = timeoutAt - Date.now();
    if (remaining <= 0) {
      // Completed polls remain visible as a result to people who were already
      // watching; only a cook leaving before the deadline returns to waiting.
      if (endsAt && endsAt <= Date.now()) return true;
      stopActivePoll();
      onChange(EMPTY_VOTE_SUMMARY);
      return false;
    }
    ownerTimer = window.setTimeout(() => {
      if (endsAt && endsAt <= Date.now()) return;
      stopActivePoll();
      onChange(EMPTY_VOTE_SUMMARY);
    }, remaining);
    return true;
  }

  const stopCurrent = onSnapshot(
    doc(db, 'dinnerVoteState', 'current'),
    (snapshot) => {
      const currentData = snapshot.exists() ? snapshot.data() : null;
      const nextPollId = currentData?.pollId || '';
      const currentEndsAt = toMillis(currentData?.endsAt);

      if (!nextPollId) {
        clearOwnerTimer();
        stopActivePoll();
        receivedCurrent = true;
        onChange(EMPTY_VOTE_SUMMARY);
        return;
      }

      // A person already watching keeps the completed poll and can see its
      // result. Someone opening the vote page after it ended sees waiting for
      // the next dinner instead.
      if (!isStillOpen(currentEndsAt)) {
        clearOwnerTimer();
        if (receivedCurrent && nextPollId === activePollId) return;
        stopActivePoll();
        receivedCurrent = true;
        onChange(EMPTY_VOTE_SUMMARY);
        return;
      }

      if (receivedCurrent && nextPollId === activePollId) {
        scheduleOwnerTimeout(currentData.ownerLastActiveAt, currentEndsAt);
        return;
      }
      receivedCurrent = true;
      clearOwnerTimer();
      stopActivePoll();
      activePollId = nextPollId || '';
      if (!scheduleOwnerTimeout(currentData.ownerLastActiveAt, currentEndsAt)) return;
      stopPoll = subscribeToDinnerVote(activePollId, userId, onChange, onError);
    },
    onError
  );

  return () => {
    stopCurrent();
    clearOwnerTimer();
    stopActivePoll();
  };
}
