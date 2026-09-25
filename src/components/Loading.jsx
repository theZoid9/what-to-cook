import React from 'react';

export default function Loading({ label = 'Loading...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
