import { ArrowRight, ChefHat } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginWithName, firebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || '/';
  const selection = location.state?.selection;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginWithName(name);
      navigate(from, { replace: true, state: selection ? { selection } : null });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page page-wrap">
      <section className="auth-card">
        <div className="auth-card__mark"><ChefHat size={25} aria-hidden="true" /></div>
        <p className="eyebrow">Dinner together</p>
        <h1>Who is cooking?</h1>
        <p>Just enter your name. No email or password needed.</p>
        {!firebaseConfigured && <div className="message message--error" role="alert">Firebase has not been configured in this copy of the app yet.</div>}
        {error && <div className="message message--error" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>Your name<input type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength="50" required autoFocus /></label>
          <Button type="submit" disabled={submitting || !firebaseConfigured}>{submitting ? 'Saving...' : <>Continue <ArrowRight size={18} aria-hidden="true" /></>}</Button>
        </form>
        <p className="auth-card__switch">Using a new name creates a separate vote for that person.</p>
      </section>
    </div>
  );
}
