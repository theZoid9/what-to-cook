import { BookOpen, ChefHat, ListPlus, Plus, RotateCw, Sparkles, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Loading from '../components/Loading';
import Atmosphere from '../components/Atmosphere';
import { getMeals } from '../services/mealService';
import { getCurrentWeekMeals, getMadeMealIds } from '../services/weeklyMealService';
import { useAuth } from '../context/AuthContext';

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

function PickerCard({ type, meal, spinning, disabled, availableCount, onSpin }) {
  const isMain = type === 'main';
  const label = isMain ? 'Main dish' : 'Side dish';
  const prompt = isMain ? 'Choose the star of dinner' : 'Choose something to serve with it';

  return (
    <section className={'picker-card picker-card--' + type} aria-label={label}>
      <div className="picker-card__topline">
        {isMain ? <ChefHat size={17} aria-hidden="true" /> : <UtensilsCrossed size={17} aria-hidden="true" />}
        <span>{label}</span>
        <small>{availableCount} available</small>
      </div>
      <div className="picker-card__choice" aria-live="polite">
        <p>{meal ? 'Picked for tonight' : prompt}</p>
        <h2>{meal?.name || '—'}</h2>
      </div>
      <Button className="picker-spin" onClick={onSpin} disabled={disabled}>
        <RotateCw size={19} className={spinning ? 'is-spinning' : ''} aria-hidden="true" />
        <span>{spinning ? 'Choosing' : meal ? `Spin ${isMain ? 'main' : 'side'} again` : `Spin ${isMain ? 'main' : 'side'}`}</span>
      </Button>
    </section>
  );
}

export default function Home() {
  const { user, firebaseConfigured } = useAuth();
  const [meals, setMeals] = useState([]);
  const [madeMealIds, setMadeMealIds] = useState(new Set());
  const [customMeals, setCustomMeals] = useState(() => getStoredList(CUSTOM_DECK_KEY));
  const [hiddenMealIds, setHiddenMealIds] = useState(() => getStoredList(HIDDEN_DECK_KEY));
  const [mainChoice, setMainChoice] = useState(null);
  const [sideChoice, setSideChoice] = useState(null);
  const [spinningType, setSpinningType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deckOpen, setDeckOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState('main');
  const [deckError, setDeckError] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOM_DECK_KEY, JSON.stringify(customMeals));
      window.localStorage.setItem(HIDDEN_DECK_KEY, JSON.stringify(hiddenMealIds));
    } catch {
      // The picker remains usable if a browser blocks local storage.
    }
  }, [customMeals, hiddenMealIds]);

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, [user]);

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
  const dinnerReady = mainChoice && sideChoice;

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
      if (type === 'main') setMainChoice(picked);
      else setSideChoice(picked);
      setSpinningType('');
    }, 950);
  }

  function addMeal(event) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      setDeckError('Give the meal a name first.');
      return;
    }
    if (deckMeals.some((meal) => meal.type === draftType && meal.name.toLowerCase() === name.toLowerCase())) {
      setDeckError(`“${name}” is already in your ${draftType} list.`);
      return;
    }
    setCustomMeals((current) => [...current, createCustomMeal(name, draftType)]);
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

  return (
    <div className="arena arena--picker">
      <Atmosphere mode={spinningType ? 'spinning' : dinnerReady ? 'revealed' : 'idle'} />
      <main className="picker-shell">
        <header className="picker-heading">
          <p className="arena-mode">{firebaseConfigured ? 'Your dinner picker' : 'Dinner picker preview'}</p>
          <h1>Build tonight’s plate.</h1>
          <p>Pick a main and a side separately. Change either one until dinner sounds right.</p>
        </header>

        {loading ? <Loading label="Loading your dinner list..." /> : (
          <div className="picker-grid">
            <PickerCard
              type="main"
              meal={mainChoice}
              spinning={spinningType === 'main'}
              disabled={Boolean(spinningType)}
              availableCount={mains.length}
              onSpin={() => spin('main')}
            />
            <PickerCard
              type="side"
              meal={sideChoice}
              spinning={spinningType === 'side'}
              disabled={Boolean(spinningType)}
              availableCount={sides.length}
              onSpin={() => spin('side')}
            />
          </div>
        )}

        {dinnerReady && (
          <section className="dinner-summary" aria-live="polite">
            <p><Sparkles size={16} aria-hidden="true" /> Tonight’s dinner</p>
            <h2>{mainChoice.name} <span>with</span> {sideChoice.name}</h2>
            <div>
              {!mainChoice.isCustom && (
                <Link className="button button--dark" to={'/meals/' + mainChoice.id}>
                  Recipe <BookOpen size={17} aria-hidden="true" />
                </Link>
              )}
              <Button variant="outline" onClick={() => { setMainChoice(null); setSideChoice(null); }}>
                Clear picks
              </Button>
            </div>
          </section>
        )}

        {error && <div className="message message--error picker-message" role="alert">{error}</div>}
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

            <form className="deck-form" onSubmit={addMeal}>
              <label htmlFor="meal-name">Add a meal</label>
              <div>
                <input id="meal-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="e.g. Mom’s grilled chicken" maxLength="70" />
                <select value={draftType} onChange={(event) => setDraftType(event.target.value)} aria-label="Meal type">
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                </select>
                <Button type="submit" className="deck-add"><Plus size={18} aria-hidden="true" /> Add</Button>
              </div>
              {deckError && <p className="deck-form__error" role="status">{deckError}</p>}
            </form>

            <div className="deck-list" aria-label="Meals in your picker">
              {deckMeals.length ? deckMeals.map((meal) => (
                <div className="deck-list__item" key={meal.id}>
                  <span>{meal.type === 'main' ? 'Main' : 'Side'}</span>
                  <strong>{meal.name}</strong>
                  <button type="button" onClick={() => removeMeal(meal)} aria-label={`Remove ${meal.name} from picker`}><Trash2 size={17} /></button>
                </div>
              )) : <p className="deck-empty">Your picker is empty. Add a main and a side to start spinning.</p>}
            </div>
            {hiddenMealIds.length > 0 && <button type="button" className="deck-restore" onClick={restoreBuiltInMeals}>Restore starter meals</button>}
          </aside>
        </div>
      )}
    </div>
  );
}
