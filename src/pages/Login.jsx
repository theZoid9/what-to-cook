import { ChefHat, Vote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, loginWithName, beginSession, firebaseConfigured, loading, sessionRole } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [destinationRole, setDestinationRole] = useState(null);

  // Wait for AuthContext to hold the selected role before leaving the entry
  // screen. Navigating in the same tick as beginSession can otherwise let the
  // route guard see a temporarily empty role and bounce back here.
  useEffect(() => {
    if (!destinationRole || !user || sessionRole !== destinationRole) return;
    setDestinationRole(null);
    navigate(destinationRole === 'cook' ? '/' : '/vote', { replace: true });
  }, [destinationRole, navigate, sessionRole, user]);

  async function continueWithName(role) {
    setError('');
    setSubmitting(true);
    try {
      await loginWithName(name);
      beginSession(role);
      setDestinationRole(role);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    continueWithName('cook');
  }

  return (
    <div className="auth-page page-wrap">
      <section className="auth-card">
        <div className="auth-card__mark"><ChefHat size={25} aria-hidden="true" /></div>
        <p className="eyebrow">Dinner together</p>
        <h1>Who’s here?</h1>
        {!firebaseConfigured && <div className="message message--error" role="alert">Firebase has not been configured in this copy of the app yet.</div>}
        {error && <div className="message message--error" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>Your name<input type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength="50" required autoFocus /></label>
          <div className="auth-form__actions">
            <Button type="submit" disabled={submitting || loading || !firebaseConfigured}>{submitting ? 'Entering...' : <>I’m cooking tonight <ChefHat size={18} aria-hidden="true" /></>}</Button>
            <Button type="button" variant="outline" onClick={() => continueWithName('voter')} disabled={submitting || loading || !firebaseConfigured}>I’m here to vote <Vote size={18} aria-hidden="true" /></Button>
          </div>
        </form>
        <p className="auth-card__switch">Choose what you’re doing tonight.</p>
      </section>
    </div>
  );
}
