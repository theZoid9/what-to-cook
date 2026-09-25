import { CalendarDays, ChefHat, LogIn, UserRound } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="floating-nav" aria-label="Primary navigation">
      <Link className="mini-brand" to="/" aria-label="What to Cook home">
        <ChefHat size={20} aria-hidden="true" />
      </Link>
      <div className="floating-nav__actions">
        <NavLink className="floating-action" to="/week" aria-label="This week's meals">
          <CalendarDays size={19} aria-hidden="true" />
          <span>Week</span>
        </NavLink>
        {user ? (
          <Link className="floating-action" to="/profile" aria-label="Profile">
            <UserRound size={19} aria-hidden="true" />
            <span>Profile</span>
          </Link>
        ) : (
          <Link className="floating-action" to="/login" aria-label="Log in">
            <LogIn size={19} aria-hidden="true" />
            <span>Log in</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
