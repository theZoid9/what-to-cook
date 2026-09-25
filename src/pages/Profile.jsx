import React from 'react';
import { ChefHat, LogOut, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout, firebaseConfigured } = useAuth();
  const navigate = useNavigate();

  async function leave() {
    await logout();
    navigate('/');
  }

  if (!user) {
    return (
      <div className="page-wrap gated-page">
        <UserRound size={32} aria-hidden="true" />
        <p className="eyebrow">Your profile</p>
        <h1>Keep meals together.</h1>
        <p>Log in to keep your household’s cooking week and saved history in one place.</p>
        <Link className="button button--primary" to="/login">Log in</Link>
        {!firebaseConfigured && <p className="muted">Firebase setup is needed before accounts can be created.</p>}
      </div>
    );
  }

  return (
    <div className="page-wrap profile-page">
      <section className="profile-card">
        <div className="profile-card__avatar">{(user.displayName || user.email).slice(0, 1).toUpperCase()}</div>
        <div>
          <p className="eyebrow">Kitchen profile</p>
          <h1>{user.displayName || 'Home cook'}</h1>
          <p>{user.email}</p>
        </div>
      </section>
      <section className="profile-info">
        <ChefHat size={25} aria-hidden="true" />
        <div><h2>Weekly meal history</h2><p>Your marked meals are private to this account and reset from the spinner every Monday.</p></div>
      </section>
      <Button variant="outline" onClick={leave}><LogOut size={18} aria-hidden="true" /> Log out</Button>
    </div>
  );
}
