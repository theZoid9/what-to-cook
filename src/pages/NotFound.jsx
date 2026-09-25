import React from 'react';
import { ArrowLeft, MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page-wrap gated-page">
      <MapPinOff size={32} aria-hidden="true" />
      <p className="eyebrow">404</p>
      <h1>That recipe has gone missing.</h1>
      <p>Head back to the spinner and we’ll find something delicious instead.</p>
      <Link className="button button--primary" to="/"><ArrowLeft size={18} aria-hidden="true" /> Back home</Link>
    </div>
  );
}
