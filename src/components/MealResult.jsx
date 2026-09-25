import React from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './Button';

export default function MealResult({ selection, onSpinAgain }) {
  return (
    <section className="meal-result" aria-live="polite">
      <div className="meal-result__body">
        <p className="reveal-label"><Sparkles size={15} aria-hidden="true" /> Tonight’s meal</p>
        <p className="reveal-main">{selection.main.name}</p>
        <div className="side-list">
          {selection.sides.map((side) => (
            <span key={side.id}><CheckCircle2 size={16} aria-hidden="true" /> {side.name}</span>
          ))}
        </div>
        <div className="reveal-actions">
          <Link className="button button--dark reveal-action" to={'/meals/' + selection.main.id} state={{ selection }}>
            Recipe <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Button variant="outline" className="reveal-action" onClick={onSpinAgain}>
            Spin again <RotateCcw size={17} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
