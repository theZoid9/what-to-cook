import { CalendarDays, UsersRound, Vote } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, sessionRole } = useAuth();

  return (
    <>
      <nav className="floating-controls" aria-label="Primary navigation">
        <div className="floating-controls__right">
          {sessionRole !== 'cook' && <NavLink className="floating-icon" to="/vote" aria-label="Vote on tonight's dinner" title="Vote">
            <Vote size={19} aria-hidden="true" />
          </NavLink>}
          <NavLink className="signed-in-chip" to="/profile" aria-label={user ? `Open profile for ${user.displayName}` : 'Open profile'} title="Profile">
            <UsersRound size={19} aria-hidden="true" />
            <span>{user?.displayName || 'Sign in'}</span>
          </NavLink>
        </div>
      </nav>
      {sessionRole === 'cook' && <NavLink className="week-fab" to="/week" aria-label="This week's meals">
          <CalendarDays size={20} aria-hidden="true" />
          <span>Week</span>
        </NavLink>}
    </>
  );
}
