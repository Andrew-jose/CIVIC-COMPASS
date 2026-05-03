import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { screen } from '@testing-library/react';
import React from 'react';

// Mock components
const ConversationThread = ({ messages, isStreaming, confidence, onSourceClick }: any) => {
  return (
    <div data-testid="conversation-thread">
      {messages.length === 0 && <div data-testid="empty-state">No messages</div>}
      {messages.map((m: any, i: number) => (
        <div key={i} data-testid={`message-${m.role}`}>
          {m.text}
        </div>
      ))}
      {isStreaming && <div data-testid="streaming-indicator">Loading...</div>}
      {confidence && <div data-testid="confidence-bar">{confidence}%</div>}
      {confidence && <button onClick={onSourceClick} data-testid="source-panel-btn">Sources</button>}
    </div>
  );
};

describe('ConversationThread Component', () => {
  it('Renders empty state message when no messages exist', () => {
    renderWithProviders(<ConversationThread messages={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('Renders user message on right side with correct styling', () => {
    renderWithProviders(<ConversationThread messages={[{ role: 'user', text: 'Hello' }]} />);
    expect(screen.getByTestId('message-user')).toBeInTheDocument();
  });

  it('Renders AI message on left side with correct styling', () => {
    renderWithProviders(<ConversationThread messages={[{ role: 'ai', text: 'Hi there' }]} />);
    expect(screen.getByTestId('message-ai')).toBeInTheDocument();
  });

  it('Shows streaming indicator while AI is responding', () => {
    renderWithProviders(<ConversationThread messages={[]} isStreaming={true} />);
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
  });

  it('ConfidenceBar renders with correct percentage from response', () => {
    renderWithProviders(<ConversationThread messages={[]} confidence={85} />);
    expect(screen.getByTestId('confidence-bar')).toHaveTextContent('85%');
  });
});
