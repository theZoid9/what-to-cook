import { CalendarDays, ChefHat, UsersRound, Vote } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <>
      <nav className="floating-controls" aria-label="Primary navigation">
        <Link className="mini-brand" to="/" aria-label="What to Cook home">
          <ChefHat size={20} aria-hidden="true" />
        </Link>
        <div className="floating-controls__right">
          <NavLink className="floating-icon" to="/vote" aria-label="Vote on tonight's dinner" title="Vote">
            <Vote size={19} aria-hidden="true" />
          </NavLink>
          <Link className="floating-icon" to="/login" aria-label={user ? 'Use a different name' : 'Sign in'} title={user?.displayName || 'Sign in'}>
            <UsersRound size={19} aria-hidden="true" />
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
