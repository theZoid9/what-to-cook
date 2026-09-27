import { CalendarDays, ChefHat, UsersRound, Vote } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <>
      <nav className="floating-nav" aria-label="Primary navigation">
        <Link className="mini-brand" to="/" aria-label="What to Cook home">
          <ChefHat size={20} aria-hidden="true" />
        </Link>
        <div className="floating-nav__actions">
          <NavLink className="floating-action" to="/vote" aria-label="Vote on tonight's dinner">
            <Vote size={19} aria-hidden="true" />
            <span>Vote</span>
          </NavLink>
          <Link className="floating-action" to="/login" aria-label={user ? 'Use a different name' : 'Log in with your name'}>
            <UsersRound size={19} aria-hidden="true" />
            <span>{user?.displayName || 'Sign in'}</span>
          </Link>
        </div>
      </nav>
      <NavLink className="week-fab" to="/week" aria-label="This week's meals">
        <CalendarDays size={20} aria-hidden="true" />
        <span>Week</span>
      </NavLink>
    </>
  );
}
