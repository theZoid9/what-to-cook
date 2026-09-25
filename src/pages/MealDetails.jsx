import { ArrowLeft, Check, ChefHat, Clock3, UsersRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import IngredientList from '../components/IngredientList';
import Loading from '../components/Loading';
import { getMealById } from '../services/mealService';
import { markMealCombinationMade } from '../services/weeklyMealService';
import { useAuth } from '../context/AuthContext';

export default function MealDetails() {
  const { mealId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meal, setMeal] = useState(location.state?.selection?.main || null);
  const [loading, setLoading] = useState(!meal);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (meal) return;
    async function loadMeal() {
      setLoading(true);
      try {
        const result = await getMealById(mealId);
        if (!result) {
          setError('We could not find that recipe.');
        } else {
          setMeal(result);
        }
      } catch (loadError) {
        setError(loadError.message || 'We could not load that recipe.');
      } finally {
        setLoading(false);
      }
    }
    loadMeal();
  }, [meal, mealId]);

  const selection = location.state?.selection || (meal?.type === 'main' ? { main: meal, sides: [] } : null);

  async function markAsMade() {
    if (!selection) return;
    if (!user) {
      navigate('/login', { state: { from: '/meals/' + mealId, selection } });
      return;
    }
    setSaving(true);
    setError('');
    try {
      await markMealCombinationMade(user.uid, selection);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message || 'We could not save this meal. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-wrap"><Loading label="Loading recipe..." /></div>;
  if (error && !meal) return <div className="page-wrap"><div className="message message--error" role="alert">{error}</div><Link className="text-link" to="/">Back home</Link></div>;

  return (
    <div className="page-wrap detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={18} aria-hidden="true" /> Back to spinner</Link>
      {error && <div className="message message--error" role="alert">{error}</div>}
      <section className="recipe-hero">
        <div>
          <p className="eyebrow">{meal.type === 'main' ? 'Main meal' : 'Side dish'}</p>
          <h1>{meal.name}</h1>
          <p>{meal.description}</p>
          <div className="recipe-stats">
            <span><Clock3 size={17} aria-hidden="true" /> {meal.cookingTime}</span>
            <span><UsersRound size={17} aria-hidden="true" /> Serves {meal.servings}</span>
            <span><ChefHat size={17} aria-hidden="true" /> {meal.difficulty}</span>
          </div>
        </div>
        {meal.imageUrl ? <img src={meal.imageUrl} alt={meal.name} /> : <div className="recipe-hero__placeholder"><ChefHat size={54} aria-hidden="true" /></div>}
      </section>

      <div className="recipe-layout">
        <section className="recipe-section">
          <p className="eyebrow">Shopping list</p>
          <h2>Ingredients</h2>
          <IngredientList ingredients={meal.ingredients} />
        </section>
        <section className="recipe-section">
          <p className="eyebrow">Get cooking</p>
          <h2>Instructions</h2>
          <ol className="instruction-list">
            {meal.instructions.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}
          </ol>
        </section>
      </div>

      {meal.type === 'main' && (
        <section className="mark-made">
          <div>
            <p className="eyebrow">Finished cooking?</p>
            <h2>{saved ? 'Saved to this week.' : 'Mark it as made'}</h2>
            <p>{saved ? 'This meal will stay out of your choices for the rest of the week.' : 'Only save it once dinner is actually on the table.'}</p>
          </div>
          {saved ? (
            <Link className="button button--primary" to="/week"><Check size={18} aria-hidden="true" /> View this week</Link>
          ) : (
            <Button onClick={markAsMade} disabled={saving}>{saving ? 'Saving...' : user ? 'Mark as made' : 'Log in to save'}</Button>
          )}
        </section>
      )}
    </div>
  );
}
