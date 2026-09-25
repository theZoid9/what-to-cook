import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import Loading from './Loading';

describe('Loading', () => {
  it('announces a useful loading message', () => {
    render(<Loading label="Finding something to cook..." />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Finding something to cook...');
  });
});
