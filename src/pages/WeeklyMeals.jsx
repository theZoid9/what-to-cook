import { CalendarCheck2, ChefHat, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { getCurrentWeekMeals } from '../services/weeklyMealService';
import { formatMealDate, getWeekLabel } from '../utils/weekUtils';

export default function WeeklyMeals() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          <p className="eyebrow"><CalendarCheck2 size={17} aria-hidden="true" /> Kitchen history</p>
          <h1>This week</h1>
          <p>{getWeekLabel()}</p>
        </div>
        <span className="record-count">{records.length} {records.length === 1 ? 'meal' : 'meals'}</span>
      </section>
      {loading && <Loading label="Loading this week’s meals..." />}
      {error && <div className="message message--error" role="alert">{error}</div>}
      {!loading && !error && records.length === 0 && (
        <section className="empty-state">
          <ChefHat size={37} aria-hidden="true" />
          <h2>No meals saved yet.</h2>
          <p>Choose a meal, cook it, then mark it made to save it here.</p>
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
