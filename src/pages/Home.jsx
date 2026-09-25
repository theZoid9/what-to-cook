import { RotateCw, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Loading from '../components/Loading';
import MealResult from '../components/MealResult';
import Atmosphere from '../components/Atmosphere';
import { getMeals } from '../services/mealService';
import { getCurrentWeekMeals, getMadeMealIds } from '../services/weeklyMealService';
import { selectMealCombination } from '../utils/randomMeal';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, firebaseConfigured } = useAuth();
  const [meals, setMeals] = useState([]);
  const [madeMealIds, setMadeMealIds] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinPhase, setSpinPhase] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);
      setError('');
      try {
        const loadedMeals = await getMeals();
        setMeals(loadedMeals);
        if (user) {
          const history = await getCurrentWeekMeals(user.uid);
          setMadeMealIds(getMadeMealIds(history));
        } else {
          setMadeMealIds(new Set());
        }
      } catch (loadError) {
        setError(loadError.message || 'We could not load meals right now.');
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, [user]);

  function spin() {
    setError('');
    if (!meals.length) {
      setError('There are no meals to choose from yet.');
      return;
    }

    setSpinPhase('spinning');
    window.setTimeout(() => {
      const result = selectMealCombination(meals, madeMealIds);
      if (result.status === 'ready') {
        setSelected(result);
      } else if (result.status === 'no-mains') {
        setSelected(null);
        setError("You've cooked every main available this week. Come back next Monday for a fresh start.");
      } else {
        setSelected(null);
        setError('There are no sides left to pair with a main this week.');
      }
      setSpinPhase('idle');
    }, 1800);
  }

  function spinAgain() {
    setSelected(null);
    setSpinPhase('idle');
    setError('');
  }

  return (
    <div className={'arena ' + (selected ? 'arena--revealed' : '')}>
      <Atmosphere mode={selected ? 'revealed' : spinPhase === 'spinning' ? 'spinning' : 'idle'} />
      {!selected && <p className="arena-mode">{firebaseConfigured ? 'Kitchen ready' : 'Choose tonight’s meal'}</p>}
      {!selected && (
        <section className={'spin-stage ' + (spinPhase === 'spinning' ? 'spin-stage--active' : '')} aria-label="Dinner spinner">
          <Button className="spin-core" onClick={spin} disabled={loading || spinPhase === 'spinning'}>
            <RotateCw size={28} className={spinPhase === 'spinning' ? 'is-spinning' : ''} aria-hidden="true" />
            <span>{spinPhase === 'spinning' ? 'DRAWING' : 'SPIN'}</span>
          </Button>
          <p className="spin-caption"><Zap size={15} aria-hidden="true" /> {spinPhase === 'spinning' ? 'Choosing something good...' : 'Tap to choose tonight’s meal'}</p>
        </section>
      )}
      {loading && <Loading label="Loading the kitchen deck..." />}
      {error && <div className="message message--error arena-message" role="alert">{error}</div>}
      {selected && spinPhase !== 'spinning' && <MealResult selection={selected} onSpinAgain={spinAgain} />}
    </div>
  );
}
