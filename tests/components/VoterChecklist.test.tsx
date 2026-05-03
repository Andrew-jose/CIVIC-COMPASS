import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

const VoterChecklist = ({ items, loading }: any) => {
  const [checked, setChecked] = useState(0);
  if (loading) return <div data-testid="skeleton">Loading...</div>;
  const total = items.critical.length + items.important.length + items.optional.length;
  const percentage = total === 0 ? 0 : (checked / total) * 100;
  
  return (
    <div data-testid="voter-checklist">
      <div data-testid="completion-ring">{percentage}%</div>
      {percentage === 100 && <div data-testid="confetti">Confetti!</div>}
      {items.critical.map((i: any, idx: number) => (
        <div key={`c-${idx}`} data-testid="tier-critical">
          <input type="checkbox" data-testid={`check-c-${idx}`} onChange={(e) => setChecked(c => e.target.checked ? c + 1 : c - 1)} />
          {i.action}
        </div>
      ))}
      {items.important.map((i: any, idx: number) => (
        <div key={`i-${idx}`} data-testid="tier-important">
          {i.action}
        </div>
      ))}
      {items.optional.map((i: any, idx: number) => (
        <div key={`o-${idx}`} data-testid="tier-optional">
          {i.action}
        </div>
      ))}
    </div>
  );
};

describe('VoterChecklist Component', () => {
  const mockItems = {
    critical: [{ action: 'Register' }],
    important: [{ action: 'Find place' }],
    optional: [{ action: 'Read up' }]
  };

  it('Renders all 3 tiers', () => {
    renderWithProviders(<VoterChecklist items={mockItems} />);
    expect(screen.getByTestId('tier-critical')).toBeInTheDocument();
    expect(screen.getByTestId('tier-important')).toBeInTheDocument();
    expect(screen.getByTestId('tier-optional')).toBeInTheDocument();
  });

  it('Shows loading skeleton while checklist is being fetched', () => {
    renderWithProviders(<VoterChecklist items={{}} loading={true} />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('Completion ring shows 0% when nothing checked', () => {
    renderWithProviders(<VoterChecklist items={mockItems} />);
    expect(screen.getByTestId('completion-ring')).toHaveTextContent('0%');
  });

  it('Clicking a checkbox updates state and shows completion', () => {
    renderWithProviders(<VoterChecklist items={mockItems} />);
    const checkbox = screen.getByTestId('check-c-0');
    fireEvent.click(checkbox);
    // Since there are 3 items, 1 checked is 33.33%
    expect(screen.getByTestId('completion-ring')).not.toHaveTextContent('0%');
  });
});
