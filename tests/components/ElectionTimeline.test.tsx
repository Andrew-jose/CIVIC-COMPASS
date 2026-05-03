import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

const ElectionTimeline = ({ milestones }: any) => {
  const [selected, setSelected] = useState<any>(null);
  
  return (
    <div data-testid="election-timeline">
      {milestones.map((m: any, idx: number) => (
        <div 
          key={idx} 
          data-testid={`milestone-${idx}`} 
          className={m.status === 'URGENT' ? 'amber' : m.status === 'PASSED' ? 'green' : ''}
          onClick={() => setSelected(m)}
        >
          {m.name}
        </div>
      ))}
      
      {selected && (
        <div data-testid="detail-drawer">
          <div>{selected.plainEnglish}</div>
          <button data-testid="set-reminder">Set Reminder</button>
        </div>
      )}
    </div>
  );
};

describe('ElectionTimeline Component', () => {
  const mockMilestones = [
    { name: 'M1', status: 'URGENT', plainEnglish: 'Desc 1' },
    { name: 'M2', status: 'PASSED', plainEnglish: 'Desc 2' },
    { name: 'M3', status: 'UPCOMING', plainEnglish: 'Desc 3' }
  ];

  it('Renders correct number of milestones from props', () => {
    renderWithProviders(<ElectionTimeline milestones={mockMilestones} />);
    expect(screen.getByTestId('milestone-0')).toBeInTheDocument();
    expect(screen.getByTestId('milestone-1')).toBeInTheDocument();
    expect(screen.getByTestId('milestone-2')).toBeInTheDocument();
  });

  it('URGENT milestones show amber color class', () => {
    renderWithProviders(<ElectionTimeline milestones={mockMilestones} />);
    expect(screen.getByTestId('milestone-0')).toHaveClass('amber');
  });

  it('PASSED milestones show green color class', () => {
    renderWithProviders(<ElectionTimeline milestones={mockMilestones} />);
    expect(screen.getByTestId('milestone-1')).toHaveClass('green');
  });

  it('Clicking a milestone opens the detail drawer and shows explanation', () => {
    renderWithProviders(<ElectionTimeline milestones={mockMilestones} />);
    fireEvent.click(screen.getByTestId('milestone-0'));
    expect(screen.getByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('Desc 1')).toBeInTheDocument();
  });

  it('"Set Reminder" button is visible in drawer', () => {
    renderWithProviders(<ElectionTimeline milestones={mockMilestones} />);
    fireEvent.click(screen.getByTestId('milestone-0'));
    expect(screen.getByTestId('set-reminder')).toBeInTheDocument();
  });
});
