import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import WeeklyMeals from './pages/WeeklyMeals';
import Login from './pages/Login';
import VotePage from './pages/VotePage';
import NotFound from './pages/NotFound';
import Loading from './components/Loading';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, loading, firebaseConfigured } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (firebaseConfigured && loading && !isLoginPage) {
    return <main className="entry-loading"><Loading label="Checking your sign-in..." /></main>;
  }

  if (firebaseConfigured && !loading && !user && !isLoginPage) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="app-shell">
      {!firebaseConfigured || user ? <Navbar /> : null}
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/week" element={<WeeklyMeals />} />
          <Route path="/login" element={<Login />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
