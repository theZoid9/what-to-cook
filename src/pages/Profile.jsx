import { ChefHat, UserRound, Vote } from 'lucide-react';
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import Atmosphere from '../components/Atmosphere';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, firebaseConfigured, sessionRole } = useAuth();

  if (firebaseConfigured && !user) return <Navigate to="/login" replace state={{ from: '/profile' }} />;

  const isCook = sessionRole === 'cook';

  return (
    <div className="profile-page">
      <Atmosphere mode="still" />
      <main className="profile-page__content">
        <section className="profile-panel">
          <div className="profile-panel__icon"><UserRound size={28} aria-hidden="true" /></div>
          <p>Signed in as</p>
          <h1>{user?.displayName || 'Guest'}</h1>
          <span>This name is only for this browser session.</span>
          <div className="profile-panel__actions">
            <Link className="button button--primary" to={isCook ? '/' : '/vote'}>
              {isCook ? <><ChefHat size={18} aria-hidden="true" /> Dinner picker</> : <><Vote size={18} aria-hidden="true" /> Tonight’s vote</>}
            </Link>
            <Link className="button button--outline" to="/login">Change name</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
