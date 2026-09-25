import { ArrowRight, ChefHat } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, firebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || '/';
  const selection = location.state?.selection;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
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
        <p className="eyebrow">Welcome back</p>
        <h1>Save your dinner decisions.</h1>
        <p>Log in to keep your weekly history personal and avoid repeat meals.</p>
        {!firebaseConfigured && <div className="message message--error" role="alert">Firebase has not been configured in this copy of the app yet.</div>}
        {error && <div className="message message--error" role="alert">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="6" required /></label>
          <Button type="submit" disabled={submitting || !firebaseConfigured}>{submitting ? 'Logging in...' : <>Log in <ArrowRight size={18} aria-hidden="true" /></>}</Button>
        </form>
        <p className="auth-card__switch">New here? <Link to="/register" state={location.state}>Create an account</Link></p>
      </section>
    </div>
  );
}
