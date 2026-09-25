import { ArrowRight, ChefHat } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, firebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      const from = location.state?.from || '/';
      navigate(from, { replace: true, state: location.state?.selection ? { selection: location.state.selection } : null });
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page page-wrap">
      <section className="auth-card">
        <div className="auth-card__mark"><ChefHat size={25} aria-hidden="true" /></div>
        <p className="eyebrow">Start your cooking week</p>
        <h1>Make dinner easier.</h1>
        <p>Create an account to save your own cooking history and keep repeats out of the spinner.</p>
        {!firebaseConfigured && <div className="message message--error" role="alert">Firebase has not been configured in this copy of the app yet.</div>}
        {error && <div className="message message--error" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>Your name<input type="text" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Password<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="6" required /></label>
          <Button type="submit" disabled={submitting || !firebaseConfigured}>{submitting ? 'Creating account...' : <>Create account <ArrowRight size={18} aria-hidden="true" /></>}</Button>
        </form>
        <p className="auth-card__switch">Already have an account? <Link to="/login" state={location.state}>Log in</Link></p>
      </section>
    </div>
  );
}
