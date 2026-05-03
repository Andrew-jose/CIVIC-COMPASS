import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';

/**
 * History Page — Past sessions and saved resources.
 * Displays conversation history, saved timelines, and completed checklists.
 */

interface SavedSession {
  id: string;
  title: string;
  date: string;
  type: 'conversation' | 'timeline' | 'checklist' | 'factcheck';
  preview: string;
  messageCount?: number;
  completionRate?: number;
}

const TYPE_CONFIG = {
  conversation: { icon: '💬', label: 'Conversation', color: 'var(--color-civic-blue)' },
  timeline: { icon: '📅', label: 'Timeline', color: 'var(--color-civic-green)' },
  checklist: { icon: '✅', label: 'Checklist', color: 'var(--color-civic-amber)' },
  factcheck: { icon: '🔍', label: 'Fact Check', color: 'var(--color-civic-red)' },
};

export function History() {
  const { messages, checklistItems } = useSessionStore();
  const [filter, setFilter] = useState<string>('all');

  // Build sessions from current state
  const sessions: SavedSession[] = [];

  if (messages.length > 0) {
    sessions.push({
      id: 'current-conversation',
      title: 'Current Conversation',
      date: new Date().toLocaleDateString(),
      type: 'conversation',
      preview: messages[messages.length - 1]?.content?.slice(0, 100) || 'Active conversation...',
      messageCount: messages.length,
    });
  }

  if (checklistItems.length > 0) {
    const completed = checklistItems.filter((i) => i.completed).length;
    sessions.push({
      id: 'current-checklist',
      title: 'Voter Readiness Checklist',
      date: new Date().toLocaleDateString(),
      type: 'checklist',
      preview: `${completed}/${checklistItems.length} items completed`,
      completionRate: Math.round((completed / checklistItems.length) * 100),
    });
  }

  // Demo sessions for visual richness
  const demoSessions: SavedSession[] = [
    {
      id: 'demo-1',
      title: 'Registration Requirements — Travis County, TX',
      date: '2026-04-28',
      type: 'conversation',
      preview: 'Asked about voter registration deadlines and ID requirements for Texas...',
      messageCount: 12,
    },
    {
      id: 'demo-2',
      title: 'November 2026 General Election Timeline',
      date: '2026-04-25',
      type: 'timeline',
      preview: '8 milestones tracked — Registration, Early Voting, Election Day...',
    },
    {
      id: 'demo-3',
      title: '"Mail ballots must be notarized" — Verdict: False',
      date: '2026-04-22',
      type: 'factcheck',
      preview: 'Verified: Texas does not require notarization for mail-in ballots.',
    },
  ];

  const allSessions = [...sessions, ...demoSessions];
  const filtered = filter === 'all' ? allSessions : allSessions.filter((s) => s.type === filter);

  return (
    <div className="min-h-screen bg-surface-primary">
      <header className="flex items-center justify-between border-b border-border-default px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">← Home</Link>
          <div className="h-5 w-px bg-border-default" />
          <h1 className="text-lg font-semibold gradient-text">Session History</h1>
        </div>
        <span className="text-sm text-text-muted">{allSessions.length} sessions</span>
      </header>

      <main id="main-content" className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['all', 'conversation', 'timeline', 'checklist', 'factcheck'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f
                    ? 'bg-civic-blue text-white'
                    : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
                }`}
              >
                {f === 'all' ? '📋 All' : `${TYPE_CONFIG[f as keyof typeof TYPE_CONFIG].icon} ${TYPE_CONFIG[f as keyof typeof TYPE_CONFIG].label}`}
              </button>
            ))}
          </div>

          {/* Session List */}
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 text-center"
              >
                <div className="text-5xl mb-4">📚</div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">No Sessions Yet</h2>
                <p className="text-text-secondary mb-4">
                  Start a conversation, explore the timeline, or check a fact to see your history here.
                </p>
                <Link to="/journey" className="inline-block px-6 py-2 bg-civic-blue text-white rounded-lg hover:opacity-90 transition-opacity">
                  Start a Conversation
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filtered.map((session, index) => {
                  const config = TYPE_CONFIG[session.type];
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card p-4 hover:border-civic-blue/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{config.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-text-primary truncate">{session.title}</h3>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                              style={{ backgroundColor: `${config.color}20`, color: config.color }}
                            >
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">{session.preview}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                            <span>{session.date}</span>
                            {session.messageCount && <span>{session.messageCount} messages</span>}
                            {session.completionRate !== undefined && (
                              <span className="flex items-center gap-1">
                                <div className="w-16 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-civic-green rounded-full"
                                    style={{ width: `${session.completionRate}%` }}
                                  />
                                </div>
                                {session.completionRate}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="text-text-muted hover:text-civic-blue transition-colors opacity-0 group-hover:opacity-100">
                          →
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Sample Data Notice */}
          {demoSessions.length > 0 && (
            <p className="text-center text-xs text-text-muted mt-6">
              ℹ️ Some sessions above are sample data for demonstration.
              Connect Firebase for persistent session history.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
