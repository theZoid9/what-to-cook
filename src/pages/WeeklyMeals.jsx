import { CalendarCheck2, ChefHat, LockKeyhole, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { clearCurrentWeekMeals, getCurrentWeekMeals } from '../services/weeklyMealService';
import { formatMealDate, getWeekLabel } from '../utils/weekUtils';

export default function WeeklyMeals() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    async function loadRecords() {
      setLoading(true);
      try {
        setRecords(await getCurrentWeekMeals(user.uid));
      } catch (loadError) {
        setError(loadError.message || 'We could not load this week’s meals.');
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, [user]);

  async function clearWeek() {
    if (!user) return;
    setClearing(true);
    setError('');
    try {
      await clearCurrentWeekMeals(user.uid);
      setRecords([]);
      setConfirmingClear(false);
    } catch (clearError) {
      setError(clearError.message || 'We could not clear this week.');
    } finally {
      setClearing(false);
    }
  }

  if (authLoading) return <div className="page-wrap"><Loading label="Checking your account..." /></div>;

  if (!user) {
    return (
      <div className="page-wrap gated-page">
        <LockKeyhole size={32} aria-hidden="true" />
        <p className="eyebrow">Your cooking history</p>
        <h1>Keep this week’s choices personal.</h1>
        <p>Log in to save meals you make and automatically keep them out of future spins.</p>
        <Link className="button button--primary" to="/login" state={{ from: '/week' }}>Log in</Link>
      </div>
    );
  }

  return (
    <div className="page-wrap weekly-page">
      <section className="section-heading">
        <div>
          <p className="eyebrow"><CalendarCheck2 size={17} aria-hidden="true" /> Dinner plan</p>
          <h1>This week</h1>
          <p>{getWeekLabel()}</p>
        </div>
        <div className="weekly-page__summary">
          <span className="record-count">{records.length} {records.length === 1 ? 'meal' : 'meals'}</span>
          {records.length > 0 && <Button className="week-clear-trigger" variant="outline" onClick={() => setConfirmingClear(true)}><Trash2 size={16} aria-hidden="true" /> Clear week</Button>}
        </div>
      </section>
      {confirmingClear && (
        <section className="week-clear-confirm" aria-live="polite">
          <p>Remove all {records.length} saved {records.length === 1 ? 'meal' : 'meals'} from this week?</p>
          <div>
            <Button variant="outline" onClick={() => setConfirmingClear(false)} disabled={clearing}>Keep them</Button>
            <Button className="week-clear-confirm__button" onClick={clearWeek} disabled={clearing}>{clearing ? 'Clearing...' : 'Yes, clear week'}</Button>
          </div>
        </section>
      )}
      {loading && <Loading label="Loading this week’s meals..." />}
      {error && <div className="message message--error" role="alert">{error}</div>}
      {!loading && !error && records.length === 0 && (
        <section className="empty-state">
          <ChefHat size={37} aria-hidden="true" />
          <h2>No meals saved yet.</h2>
          <p>After the family vote, save the dinner here to build your week.</p>
          <Link className="button button--primary" to="/">Choose a meal</Link>
        </section>
      )}
      <div className="weekly-list">
        {records.map((record) => (
          <article className="weekly-record" key={record.id}>
            <time>{formatMealDate(record.dateMade)}</time>
            <div>
              <p className="eyebrow">Main</p>
              <h2>{record.mainMeal?.name || 'Meal'}</h2>
              <p className="eyebrow weekly-record__side-label">Sides</p>
              <p>{(record.sideMeals || []).map((side) => side.name).join(' · ') || 'No sides saved'}</p>
            </div>
            <span className="made-badge">Made</span>
          </article>
        ))}
      </div>
    </div>
  );
}
