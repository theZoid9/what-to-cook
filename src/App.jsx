import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import WeeklyMeals from './pages/WeeklyMeals';
import Login from './pages/Login';
import VotePage from './pages/VotePage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
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
