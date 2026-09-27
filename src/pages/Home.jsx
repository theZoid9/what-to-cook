import { ListPlus, PencilLine, Plus, RotateCw, Sparkles, ThumbsDown, ThumbsUp, Trash2, UsersRound, Vote, X } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Atmosphere from '../components/Atmosphere';
import SaveDinnerButton from '../components/SaveDinnerButton';
import VoteCountdown from '../components/VoteCountdown';
import { getMeals } from '../services/mealService';
import { sampleMeals } from '../data/sampleMeals';
import { getCurrentWeekMeals, getMadeMealIds } from '../services/weeklyMealService';
import { cancelCurrentDinnerVote, castDinnerVote, COOK_HEARTBEAT_MS, getOrCreateTonightVote, keepCurrentVoteAlive, subscribeToDinnerVote } from '../services/dinnerVoteService';
import { useAuth } from '../context/AuthContext';
import { getVoteOutcome } from '../utils/voteUtils';

const CUSTOM_DECK_KEY = 'what-to-cook.custom-meals.v1';
const HIDDEN_DECK_KEY = 'what-to-cook.hidden-meal-ids.v1';

function getStoredList(key) {
  try {
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isUsableMeal(meal) {
  return Boolean(
    meal &&
      typeof meal.id === 'string' &&
      typeof meal.name === 'string' &&
      meal.name.trim() &&
      (meal.type === 'main' || meal.type === 'side')
  );
}

function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function createCustomMeal(name, type) {
  const suffix = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id: `custom-${suffix}`,
    name: name.trim(),
    type,
    description: 'A personal addition to your dinner picker.',
    ingredients: [],
    instructions: [],
    cookingTime: 'Your choice',
    servings: 'Your choice',
    difficulty: 'Your choice',
    isCustom: true
  };
}

function PickerStage({ type, meal, spinning, disabled, onSpin }) {
  const isMain = type === 'main';

  return (
    <section className={'spin-stage spin-stage--compact spin-stage--' + type + (spinning ? ' spin-stage--active' : '')} aria-label={isMain ? 'Choose a main dish' : 'Choose a side dish'}>
      <p className="compact-spin-label">{isMain ? 'Main' : 'Side'}</p>
      <button className="spin-core" type="button" onClick={onSpin} disabled={disabled} aria-label={spinning ? 'Choosing a meal' : `Spin for a ${isMain ? 'main' : 'side'} dish`}>
        <strong>{spinning ? 'Mixing…' : 'SPIN'}</strong>
        <RotateCw size={30} className={spinning ? 'is-spinning' : ''} aria-hidden="true" />
      </button>
      <p className="compact-spin-choice">{meal?.name || 'Not picked yet'}</p>
    </section>
  );
}

export default function Home() {
  const { user, firebaseConfigured, loading: authLoading } = useAuth();
  // Starter meals are bundled with the app, so the spinner can appear as soon
  // as the cook checks in. Firebase then quietly adds any remote meals/history.
  const [meals, setMeals] = useState(sampleMeals);
  const [madeMealIds, setMadeMealIds] = useState(new Set());
  const [customMeals, setCustomMeals] = useState(() => getStoredList(CUSTOM_DECK_KEY));
  const [hiddenMealIds, setHiddenMealIds] = useState(() => getStoredList(HIDDEN_DECK_KEY));
  const [mainChoice, setMainChoice] = useState(null);
  const [sideChoice, setSideChoice] = useState(null);
  const [pickerStep, setPickerStep] = useState('pick');
  const [spinningType, setSpinningType] = useState('');
  const [error, setError] = useState('');
  const [deckOpen, setDeckOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMainName, setManualMainName] = useState('');
  const [manualSideName, setManualSideName] = useState('');
  const [manualError, setManualError] = useState('');
  const [draftName, setDraftName] = useState('');
  const [deckTab, setDeckTab] = useState('main');
  const [deckError, setDeckError] = useState('');
  const [poll, setPoll] = useState(null);
  const [voteSummary, setVoteSummary] = useState({ yes: 0, no: 0, total: 0, mine: '', voters: [] });
  const [voteSaving, setVoteSaving] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_DECK_KEY, JSON.stringify(customMeals));
      window.localStorage.setItem(HIDDEN_DECK_KEY, JSON.stringify(hiddenMealIds));
    } catch {
      // The picker remains usable if a browser blocks local storage.
    }
  }, [customMeals, hiddenMealIds]);

  useEffect(() => {
    if (authLoading) return undefined;
    async function loadHomeData() {
      setError('');
      try {
        const loadedMeals = await getMeals();
        setMeals(Array.isArray(loadedMeals) ? loadedMeals : []);
        if (user) {
          const history = await getCurrentWeekMeals(user.uid);
          setMadeMealIds(getMadeMealIds(history));
        } else {
          setMadeMealIds(new Set());
        }
      } catch (loadError) {
        setError(loadError.message || 'We could not load your dinner list right now.');
      }
    }
    loadHomeData();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || !firebaseConfigured || !poll?.id) return undefined;
    return subscribeToDinnerVote(
      poll.id,
      user.uid,
      (nextSummary) => {
        setPoll(nextSummary.poll);
        setVoteSummary(nextSummary);
        if (nextSummary.poll?.endsAt && nextSummary.poll.endsAt <= Date.now()) setPickerStep('vote-result');
      },
      (snapshotError) => setError(snapshotError.message || 'We could not load the votes right now.')
    );
  }, [user, firebaseConfigured, poll?.id]);

  useEffect(() => {
    if (pickerStep !== 'vote' || !poll?.id || !user || !firebaseConfigured) return undefined;

    let isActive = true;
    const reportPresence = () => {
      keepCurrentVoteAlive(user.uid).catch((heartbeatError) => {
        if (isActive) setError(heartbeatError.message || 'We could not keep the vote open.');
      });
    };
    reportPresence();
    const heartbeat = window.setInterval(reportPresence, COOK_HEARTBEAT_MS);
    return () => {
      isActive = false;
      window.clearInterval(heartbeat);
    };
  }, [pickerStep, poll?.id, user?.uid, firebaseConfigured]);

  const deckMeals = useMemo(() => {
    const hidden = new Set(hiddenMealIds);
    const byId = new Map();
    [...meals, ...customMeals].filter(isUsableMeal).forEach((meal) => byId.set(meal.id, meal));
    return [...byId.values()].filter((meal) => !hidden.has(meal.id));
  }, [meals, customMeals, hiddenMealIds]);

  const availableMeals = useMemo(
    () => deckMeals.filter((meal) => !madeMealIds.has(meal.id)),
    [deckMeals, madeMealIds]
  );
  const mains = useMemo(() => availableMeals.filter((meal) => meal.type === 'main'), [availableMeals]);
  const sides = useMemo(() => availableMeals.filter((meal) => meal.type === 'side'), [availableMeals]);
  const deckMains = useMemo(() => deckMeals.filter((meal) => meal.type === 'main'), [deckMeals]);
  const deckSides = useMemo(() => deckMeals.filter((meal) => meal.type === 'side'), [deckMeals]);
  const visibleDeckMeals = deckTab === 'main' ? deckMains : deckSides;
  const dinnerReady = Boolean(mainChoice && sideChoice);
  const mealApproved = voteSummary.yes > voteSummary.no;

  function spin(type) {
    const candidates = type === 'main' ? mains : sides;
    const label = type === 'main' ? 'main' : 'side';
    setError('');
    if (!candidates.length) {
      setDeckOpen(true);
      setError(
        deckMeals.some((meal) => meal.type === type)
          ? `Every ${label} in your list has been made this week. Add another ${label} or wait for a new week.`
          : `Your dinner list needs at least one ${label}. Add one with the list button.`
      );
      return;
    }

    setSpinningType(type);
    window.setTimeout(() => {
      const picked = choose(candidates);
      if (type === 'main') {
        setMainChoice(picked);
        setPickerStep('pick');
      } else {
        setSideChoice(picked);
        setPickerStep('pick');
      }
      setSpinningType('');
    }, 950);
  }

  async function openVoting(selection = { main: mainChoice, side: sideChoice }) {
    if (!firebaseConfigured) {
      setError('Voting needs Firebase to be configured first.');
      return;
    }
    if (!user) {
      setError('Log in first so each person can have one vote.');
      return;
    }
    if (!selection.main || !selection.side) return;

    setVoteSaving(true);
    setError('');
    try {
      const currentPoll = await getOrCreateTonightVote(user.uid, selection);
      setPoll(currentPoll);
      setMainChoice(currentPoll.main);
      setSideChoice(currentPoll.side);
      setPickerStep(currentPoll.endsAt && currentPoll.endsAt <= Date.now() ? 'vote-result' : 'vote');
    } catch (voteError) {
      setError(voteError.message || 'We could not open tonight’s vote.');
    } finally {
      setVoteSaving(false);
    }
  }

  function openManualDinner() {
    setManualError('');
    setManualOpen(true);
  }

  function submitManualDinner(event) {
    event.preventDefault();
    const main = manualMainName.trim();
    const side = manualSideName.trim();
    if (!main || !side) {
      setManualError('Add both a main and a side first.');
      return;
    }
    setManualOpen(false);
    setManualMainName('');
    setManualSideName('');
    setManualError('');
    openVoting({ main: createCustomMeal(main, 'main'), side: createCustomMeal(side, 'side') });
  }

  async function submitVote(choice) {
    if (!user || !poll) return;
    setVoteSaving(true);
    setError('');
    try {
      await castDinnerVote(poll.id, user.uid, choice, user.displayName);
      setVoteSummary((current) => ({ ...current, mine: choice }));
    } catch (voteError) {
      setError(voteError.message || 'We could not save your vote.');
    } finally {
      setVoteSaving(false);
    }
  }

  async function cancelVote() {
    if (!user || !poll?.id) {
      setPickerStep('pick');
      return;
    }
    setVoteSaving(true);
    setError('');
    try {
      await cancelCurrentDinnerVote(user.uid, poll.id);
      setPoll(null);
      setVoteSummary({ yes: 0, no: 0, total: 0, mine: '', voters: [] });
      setPickerStep('pick');
    } catch (cancelError) {
      setError(cancelError.message || 'We could not cancel the vote.');
    } finally {
      setVoteSaving(false);
    }
  }

  function chooseAnotherDinner() {
    setMainChoice(null);
    setSideChoice(null);
    setPoll(null);
    setVoteSummary({ yes: 0, no: 0, total: 0, mine: '', voters: [] });
    setPickerStep('pick');
  }

  function addMeal(event) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      setDeckError('Give the meal a name first.');
      return;
    }
    if (deckMeals.some((meal) => meal.type === deckTab && meal.name.toLowerCase() === name.toLowerCase())) {
      setDeckError(`“${name}” is already in your ${deckTab} list.`);
      return;
    }
    setCustomMeals((current) => [...current, createCustomMeal(name, deckTab)]);
    setDraftName('');
    setDeckError('');
  }

  function removeMeal(meal) {
    if (meal.isCustom || meal.id.startsWith('custom-')) {
      setCustomMeals((current) => current.filter((item) => item.id !== meal.id));
    } else {
      setHiddenMealIds((current) => [...new Set([...current, meal.id])]);
    }
    if (mainChoice?.id === meal.id) setMainChoice(null);
    if (sideChoice?.id === meal.id) setSideChoice(null);
  }

  function restoreBuiltInMeals() {
    setHiddenMealIds([]);
    setDeckError('All starter meals are back in your picker.');
  }

  if (firebaseConfigured && !user) {
    return <Navigate to="/login" replace state={{ from: '/' }} />;
  }

  return (
    <div className="arena arena--picker">
      <Atmosphere mode={spinningType ? 'spinning' : dinnerReady ? 'still' : 'idle'} />
      <main className="picker-shell">
        <header className="picker-heading">
          {pickerStep !== 'vote-result' && <p className="arena-mode">{firebaseConfigured ? 'Your dinner picker' : 'Dinner picker preview'}</p>}
          {pickerStep !== 'vote-result' && <h1>{pickerStep === 'vote' ? 'Vote' : 'Pick tonight’s dinner.'}</h1>}
          {pickerStep !== 'vote-result' && pickerStep !== 'vote' && <p>Spin a main and side. When both are ready, dinner appears below.</p>}
        </header>

        {pickerStep === 'pick' && (
          <>
            <div className="picker-grid picker-grid--double">
              <PickerStage
                type="main"
                meal={mainChoice}
                spinning={spinningType === 'main'}
                disabled={Boolean(spinningType)}
                onSpin={() => spin('main')}
              />
              <PickerStage
                type="side"
                meal={sideChoice}
                spinning={spinningType === 'side'}
                disabled={Boolean(spinningType)}
                onSpin={() => spin('side')}
              />
            </div>
            <button className="manual-dinner-trigger" type="button" onClick={openManualDinner}><PencilLine size={16} aria-hidden="true" /> Enter dinner manually</button>
          </>
        )}

        {pickerStep === 'pick' && dinnerReady && (
          <section className="dinner-summary" aria-live="polite">
            <p><Sparkles size={16} aria-hidden="true" /> Tonight’s dinner</p>
            <h2>{mainChoice.name} <span>with</span> {sideChoice.name}</h2>
            <div>
              {user && firebaseConfigured ? (
                <Button variant="outline" className="vote-open" onClick={openVoting} disabled={voteSaving}>
                  <Vote size={18} aria-hidden="true" /> {voteSaving ? 'Starting vote…' : 'Start vote'}
                </Button>
              ) : user ? (
                <Button variant="outline" className="vote-open" onClick={openVoting}>Set up voting</Button>
              ) : (
                <Link className="button button--outline vote-open" to="/login"><Vote size={18} aria-hidden="true" /> Log in to vote</Link>
              )}
              {error && <p className="vote-open-error" role="alert">{error}</p>}
            </div>
          </section>
        )}

        {pickerStep === 'vote' && dinnerReady && (
          <section className="vote-screen" aria-live="polite">
            <p className="vote-screen__label"><UsersRound size={16} aria-hidden="true" /> Dinner vote</p>
            <h2>{mainChoice.name} <span>with</span> {sideChoice.name}</h2>
            <VoteCountdown endsAt={poll?.endsAt} onComplete={() => setPickerStep('vote-result')} />
            <p className="vote-screen__prompt">Would you eat this tonight?</p>
            <div className="vote-actions">
              <Button className="vote-choice vote-choice--yes" onClick={() => submitVote('yes')} disabled={voteSaving}>
                <ThumbsUp size={22} aria-hidden="true" /> Yes
              </Button>
              <Button className="vote-choice vote-choice--no" onClick={() => submitVote('no')} disabled={voteSaving}>
                <ThumbsDown size={22} aria-hidden="true" /> No
              </Button>
            </div>
            <p className="vote-progress"><strong>{voteSummary.total}</strong> {voteSummary.total === 1 ? 'vote' : 'votes'} in</p>
            {voteSummary.voters.length > 0 && <p className="vote-voters">Voted: {voteSummary.voters.map((voter) => voter.name).join(' · ')}</p>}
            <button className="vote-back" type="button" onClick={cancelVote} disabled={voteSaving}>Cancel this vote</button>
          </section>
        )}

        {pickerStep === 'vote-result' && dinnerReady && (
          <section className="vote-results" aria-live="polite">
            <p className="vote-screen__label"><Vote size={16} aria-hidden="true" /> Vote complete</p>
            <h2>{getVoteOutcome(voteSummary).title}</h2>
            <p className="vote-result-meal">{mainChoice.name} <span>with</span> {sideChoice.name}</p>
            <div className="vote-totals">
              <div><ThumbsUp size={20} aria-hidden="true" /><strong>{voteSummary.yes}</strong><span>Yes</span></div>
              <div><ThumbsDown size={20} aria-hidden="true" /><strong>{voteSummary.no}</strong><span>No</span></div>
            </div>
            <p className="vote-note">{getVoteOutcome(voteSummary).message}</p>
            {mealApproved ? (
              <><p className="vote-next-step">Next: save dinner to this week, then get cooking.</p><SaveDinnerButton poll={poll} /></>
            ) : (
              <div className="vote-results__actions"><p className="vote-next-step">Next: choose a different dinner and start a fresh vote.</p><Button variant="outline" onClick={chooseAnotherDinner}>Choose another dinner</Button></div>
            )}
          </section>
        )}

        {error && !(pickerStep === 'pick' && dinnerReady) && <div className="message message--error picker-message" role="alert">{error}</div>}
      </main>

      <button className="deck-fab" type="button" onClick={() => setDeckOpen(true)} aria-label="Manage main and side lists">
        <ListPlus size={23} aria-hidden="true" />
      </button>

      {deckOpen && (
        <div className="deck-overlay" role="presentation">
          <button className="deck-overlay__backdrop" type="button" onClick={() => setDeckOpen(false)} aria-label="Close meal list" />
          <aside className="deck-sheet" role="dialog" aria-modal="true" aria-labelledby="deck-title">
            <header>
              <div>
                <p>Your private picker</p>
                <h2 id="deck-title">Mains & sides</h2>
              </div>
              <button type="button" className="deck-close" onClick={() => setDeckOpen(false)} aria-label="Close meal list"><X size={21} /></button>
            </header>

            <div className="deck-tabs" role="tablist" aria-label="Meal type">
              <button type="button" role="tab" aria-selected={deckTab === 'main'} className={deckTab === 'main' ? 'is-active' : ''} onClick={() => { setDeckTab('main'); setDeckError(''); }}>
                Mains <span>{deckMains.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={deckTab === 'side'} className={deckTab === 'side' ? 'is-active' : ''} onClick={() => { setDeckTab('side'); setDeckError(''); }}>
                Sides <span>{deckSides.length}</span>
              </button>
            </div>

            <form className="deck-form" onSubmit={addMeal}>
              <label htmlFor="meal-name">Add a {deckTab}</label>
              <div>
                <input id="meal-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={deckTab === 'main' ? 'e.g. Steak' : 'e.g. Rice'} maxLength="70" />
                <Button type="submit" className="deck-add"><Plus size={18} aria-hidden="true" /> Add</Button>
              </div>
              {deckError && <p className="deck-form__error" role="status">{deckError}</p>}
            </form>

            <div className="deck-list" role="tabpanel" aria-label={`${deckTab === 'main' ? 'Main meals' : 'Side meals'} in your picker`}>
              <h3>{deckTab === 'main' ? 'Main meals' : 'Side meals'}</h3>
              {visibleDeckMeals.length ? visibleDeckMeals.map((meal) => (
                <div className="deck-list__item" key={meal.id}>
                  <strong>{meal.name}</strong>
                  <button type="button" onClick={() => removeMeal(meal)} aria-label={`Remove ${meal.name} from picker`}><Trash2 size={17} /></button>
                </div>
              )) : <p className="deck-empty">No {deckTab}s yet. Add one above to make it available in the spinner.</p>}
            </div>
            {hiddenMealIds.length > 0 && <button type="button" className="deck-restore" onClick={restoreBuiltInMeals}>Restore starter meals</button>}
          </aside>
        </div>
      )}

      {manualOpen && (
        <div className="deck-overlay" role="presentation">
          <button className="deck-overlay__backdrop" type="button" onClick={() => setManualOpen(false)} aria-label="Close manual dinner entry" />
          <aside className="deck-sheet manual-dinner-sheet" role="dialog" aria-modal="true" aria-labelledby="manual-dinner-title">
            <header>
              <div>
                <p>Tonight’s dinner</p>
                <h2 id="manual-dinner-title">Enter it manually</h2>
              </div>
              <button type="button" className="deck-close" onClick={() => setManualOpen(false)} aria-label="Close manual dinner entry"><X size={21} /></button>
            </header>
            <form className="manual-dinner-form" onSubmit={submitManualDinner}>
              <label htmlFor="manual-main">Main dish<input id="manual-main" value={manualMainName} onChange={(event) => setManualMainName(event.target.value)} placeholder="e.g. Steak" maxLength="70" autoFocus /></label>
              <label htmlFor="manual-side">Side dish<input id="manual-side" value={manualSideName} onChange={(event) => setManualSideName(event.target.value)} placeholder="e.g. Garden salad" maxLength="70" /></label>
              {manualError && <p className="deck-form__error" role="alert">{manualError}</p>}
              <Button type="submit" className="manual-dinner-submit"><Vote size={18} aria-hidden="true" /> Use this dinner & vote</Button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
