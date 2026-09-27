import { CalendarDays, House, UsersRound, Vote } from 'lucide-react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, sessionRole } = useAuth();
  const location = useLocation();
  const isVoting = location.pathname === '/vote';

  return (
    <>
      <nav className="floating-controls" aria-label="Primary navigation">
        <div className="floating-controls__right">
          {sessionRole !== 'cook' && <NavLink className="floating-icon" to="/vote" aria-label="Vote on tonight's dinner" title="Vote">
            <Vote size={19} aria-hidden="true" />
          </NavLink>}
          <span className="signed-in-chip signed-in-chip--static" aria-label={user ? `Signed in as ${user.displayName}` : 'Signed in'}>
            <UsersRound size={19} aria-hidden="true" />
            <span>{user?.displayName || 'Sign in'}</span>
          </span>
          {sessionRole === 'cook' && !isVoting && <Link className="floating-icon" to="/" aria-label="Go to dinner picker" title="Home">
            <House size={19} aria-hidden="true" />
          </Link>}
        </div>
      </nav>
      {sessionRole === 'cook' && <NavLink className="week-fab" to="/week" aria-label="This week's meals">
          <CalendarDays size={20} aria-hidden="true" />
          <span>Week</span>
        </NavLink>}
    </>
  );
}
