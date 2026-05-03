import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';
import { ElectionTimeline } from '../components/ElectionTimeline';
import type { Milestone } from '../components/ElectionTimeline';

/**
 * Timeline Page — Visual interactive election timeline.
 * Fetches milestone data from the backend (Gemini 3 + Structured Output),
 * then renders it using the ElectionTimeline component.
 */

// Demo milestones shown when no API data is available
const DEMO_MILESTONES: Milestone[] = [
  {
    id: 'reg-deadline',
    title: 'Voter Registration Deadline',
    date: '2026-10-05',
    description: 'Last day to register to vote or update your registration for the upcoming election. If you\'ve moved, changed your name, or haven\'t registered before, this is your deadline.',
    actionRequired: 'Check your registration status at your state\'s official website. If not registered, complete your registration online or by mail before this date.',
    status: 'upcoming',
    priority: 'critical',
  },
  {
    id: 'early-voting-start',
    title: 'Early Voting Begins',
    date: '2026-10-19',
    description: 'Early voting opens at designated polling locations across your county. You can vote in person before Election Day without needing a reason or excuse.',
    actionRequired: 'Find your nearest early voting location and check the hours. Bring your valid photo ID.',
    status: 'upcoming',
    priority: 'important',
  },
  {
    id: 'mail-ballot-deadline',
    title: 'Mail-In Ballot Request Deadline',
    date: '2026-10-23',
    description: 'Last day to request a mail-in (absentee) ballot. If you prefer to vote by mail, your application must be received by the election office by this date.',
    actionRequired: 'Submit your mail-in ballot application online or in person at your county election office.',
    status: 'upcoming',
    priority: 'important',
  },
  {
    id: 'early-voting-end',
    title: 'Early Voting Ends',
    date: '2026-10-30',
    description: 'Last day of the early voting period. After this date, you can only vote on Election Day at your assigned polling place.',
    actionRequired: 'If you haven\'t voted yet, plan to vote today or on Election Day.',
    status: 'upcoming',
    priority: 'important',
  },
  {
    id: 'election-day',
    title: 'Election Day',
    date: '2026-11-03',
    description: 'The main election day. Polls are open from 7:00 AM to 7:00 PM. You must vote at your assigned polling location if you did not vote early.',
    actionRequired: 'Go to your assigned polling place with valid photo ID. Polls close at 7:00 PM — if you\'re in line by then, you can still vote.',
    status: 'upcoming',
    priority: 'critical',
  },
  {
    id: 'certification',
    title: 'Results Certification',
    date: '2026-11-17',
    description: 'The county canvasses and certifies the official election results. After this date, results are considered final unless a recount is ordered.',
    status: 'upcoming',
    priority: 'optional',
  },
];

export function Timeline() {
  const { jurisdiction } = useSessionStore();
  const [milestones, setMilestones] = useState<Milestone[]>(DEMO_MILESTONES);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real timeline from backend if jurisdiction is resolved
  useEffect(() => {
    if (!jurisdiction) return;

    const fetchTimeline = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/v1/timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jurisdictionContext: jurisdiction }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.timeline?.milestones?.length > 0) {
            setMilestones(data.timeline.milestones);
          }
        }
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [jurisdiction]);

  // Compute next deadline
  const today = new Date();
  const upcomingMilestones = milestones
    .filter(m => new Date(m.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextDeadline = upcomingMilestones[0]
    ? {
        title: upcomingMilestones[0].title,
        date: upcomingMilestones[0].date,
        daysUntil: Math.ceil((new Date(upcomingMilestones[0].date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      }
    : undefined;

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-default px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/journey" className="text-text-muted hover:text-text-primary transition-colors" aria-label="Back to journey">← Back</Link>
          <div className="h-5 w-px bg-border-default" />
          <h1 className="text-lg font-semibold gradient-text">Election Timeline</h1>
        </div>
        {jurisdiction && (
          <span className="hidden sm:inline text-sm text-text-secondary">
            📍 {jurisdiction.county}, {jurisdiction.state}
          </span>
        )}
      </header>

      {/* Content */}
      <main id="main-content" className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl">
          {isLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
              <svg className="animate-spin h-6 w-6 text-civic-blue mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              <p className="text-text-secondary">Generating your personalized timeline...</p>
            </motion.div>
          ) : (
            <ElectionTimeline milestones={milestones} nextDeadline={nextDeadline} />
          )}

          {!jurisdiction && (
            <div className="mt-4 glass-card p-4 text-center">
              <p className="text-xs text-text-muted">
                💡 These are sample dates. <Link to="/" className="text-civic-blue-light underline">Enter your address</Link> to see your actual election timeline.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
