import React, { lazy, Suspense, useMemo, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';

// 1. Code Splitting / Lazy Loading implementation
export const JourneyPage = lazy(() => import('../pages/JourneyPage'));
export const TimelinePage = lazy(() => import('../pages/TimelinePage'));
export const BallotPage = lazy(() => import('../pages/BallotPage'));
export const ChecklistPage = lazy(() => import('../pages/ChecklistPage'));

export const SkeletonLoader = () => (
  <div className="skeleton-loader" aria-hidden="true" style={{ animation: 'pulse 1.5s infinite' }}>
    <div style={{ height: 20, width: '100%', background: '#e0e0e0', margin: '10px 0' }} />
    <div style={{ height: 20, width: '80%', background: '#e0e0e0', margin: '10px 0' }} />
  </div>
);

export const RouteWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SkeletonLoader />}>
    {children}
  </Suspense>
);

// 2 & 3. Virtual scrolling and Memoization for ConversationThread
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface ConversationProps {
  messages: Message[];
}

export const ConversationThread = ({ messages }: ConversationProps) => {
  // useMemo to prevent full re-renders of the list array
  const renderedMessages = useMemo(() => messages, [messages]);

  const Row = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const msg = renderedMessages[index];
    return (
      <div style={style} className={`message ${msg.role}`}>
        {msg.text}
      </div>
    );
  }, [renderedMessages]);

  return (
    <List
      height={600}
      itemCount={renderedMessages.length}
      itemSize={80} // Fixed row height: 80px minimum
      width="100%"
      overscanCount={5} // Overscan: 5 items
    >
      {Row}
    </List>
  );
};

// Memoization for VoterChecklist
interface ChecklistProps {
  items: Array<{ id: string; action: string; checked: boolean }>;
  onToggle: (id: string) => void;
}

export const VoterChecklist = ({ items, onToggle }: ChecklistProps) => {
  // useCallback prevents recreation on every render
  const handleToggle = useCallback((id: string) => {
    onToggle(id);
  }, [onToggle]);

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <input 
            type="checkbox" 
            checked={item.checked} 
            onChange={() => handleToggle(item.id)} 
          />
          {item.action}
        </div>
      ))}
    </div>
  );
};

// Memoization for ElectionTimeline
interface TimelineProps {
  jurisdiction: string;
  dates: any[];
}

const TimelineBase = ({ jurisdiction, dates }: TimelineProps) => {
  return <div>Timeline for {jurisdiction}</div>;
};

// Only re-render when jurisdiction or dates change (Custom comparator)
export const ElectionTimeline = memo(TimelineBase, (prev, next) => {
  return prev.jurisdiction === next.jurisdiction && 
         JSON.stringify(prev.dates) === JSON.stringify(next.dates);
});

// 4. Image Optimization (SVG example)
export const CivicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
