import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';
import type { ChecklistItem } from '../store/useSessionStore';
import { VoterChecklist } from '../components/VoterChecklist';

/**
 * Checklist Page — Personalized voter readiness checklist.
 * Onboarding questions → Gemini 3.1 Pro generates checklist → checkable items with progress.
 */

const DEMO_CHECKLIST: ChecklistItem[] = [
  { id: 'check-reg', title: 'Verify your voter registration', description: 'Confirm your name, address, and party affiliation are current and correct in the voter registration database.', whyItMatters: 'If your registration is outdated or missing, you may not be able to vote on Election Day.', deadline: 'October 5, 2026', officialUrl: 'https://www.vote.org/am-i-registered-to-vote/', priority: 'critical', completed: false },
  { id: 'get-id', title: 'Obtain valid photo ID', description: 'Ensure you have a state-accepted form of photo identification ready for the polls.', whyItMatters: 'Many states require a valid photo ID to vote. Without one, you may only be allowed to cast a provisional ballot.', officialUrl: 'https://www.vote.org/voter-id-laws/', priority: 'critical', completed: false },
  { id: 'find-polling', title: 'Find your polling location', description: 'Look up your assigned polling place for Election Day. Early voting locations may differ.', deadline: 'Before November 3, 2026', officialUrl: 'https://www.vote.org/polling-place-locator/', priority: 'important', completed: false },
  { id: 'review-ballot', title: 'Review your sample ballot', description: 'Study the candidates and ballot measures before you head to the polls so you can make informed choices.', whyItMatters: 'Understanding your ballot ahead of time saves time in the voting booth and reduces confusion.', priority: 'important', completed: false },
  { id: 'plan-transport', title: 'Plan your transportation', description: 'Decide how you will get to the polls — driving, public transit, ride-share, or walking.', priority: 'optional', completed: false },
  { id: 'check-hours', title: 'Confirm polling hours', description: 'Verify when your polling location opens and closes. Most locations are open 7 AM to 7 PM.', deadline: 'November 3, 2026', priority: 'important', completed: false },
];

interface OnboardingAnswers {
  isRegistered: boolean;
  hasMovedRecently: boolean;
  votingMethod: 'in-person' | 'mail' | 'undecided';
  needsAccessibility: boolean;
  isFirstTimeInState: boolean;
}

export function Checklist() {
  const { jurisdiction, checklistItems, setChecklistItems } = useSessionStore();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    isRegistered: false,
    hasMovedRecently: false,
    votingMethod: 'undecided',
    needsAccessibility: false,
    isFirstTimeInState: false,
  });

  // Load demo checklist if none exists
  useEffect(() => {
    if (checklistItems.length === 0) {
      setChecklistItems(DEMO_CHECKLIST);
    }
  }, []);

  const handleGenerate = async () => {
    if (!jurisdiction) {
      setShowOnboarding(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jurisdictionContext: jurisdiction, userAnswers: answers }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.checklist?.items?.length > 0) {
          setChecklistItems(data.checklist.items.map((item: any) => ({ ...item, completed: false })));
        }
      }
    } catch (error) {
      console.error('Failed to generate checklist:', error);
    } finally {
      setIsLoading(false);
      setShowOnboarding(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary">
      <header className="flex items-center justify-between border-b border-border-default px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/journey" className="text-text-muted hover:text-text-primary transition-colors">← Back</Link>
          <div className="h-5 w-px bg-border-default" />
          <h1 className="text-lg font-semibold gradient-text">Voter Checklist</h1>
        </div>
      </header>

      <main id="main-content" className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl">
          {/* Onboarding questions */}
          {showOnboarding && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-5 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">Quick Questions</h2>
                <p className="text-sm text-text-secondary">Answer these to get a personalized checklist powered by Gemini 3.1 Pro.</p>
              </div>

              {[
                { key: 'isRegistered' as const, label: 'Are you currently registered to vote?' },
                { key: 'hasMovedRecently' as const, label: 'Have you moved in the last 12 months?' },
                { key: 'needsAccessibility' as const, label: 'Do you need accessibility accommodations?' },
                { key: 'isFirstTimeInState' as const, label: 'Is this your first time voting in this state?' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">{label}</span>
                  <div className="flex gap-2">
                    {['Yes', 'No'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setAnswers(prev => ({ ...prev, [key]: option === 'Yes' }))}
                        className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                          (option === 'Yes' ? answers[key] : !answers[key])
                            ? 'bg-civic-blue border-civic-blue text-white'
                            : 'border-border-default text-text-secondary hover:border-civic-blue/50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <span className="text-sm text-text-primary block mb-2">How do you plan to vote?</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'in-person' as const, label: '🏛️ In Person' },
                    { value: 'mail' as const, label: '📮 By Mail' },
                    { value: 'undecided' as const, label: '🤔 Undecided' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setAnswers(prev => ({ ...prev, votingMethod: value }))}
                      className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                        answers.votingMethod === value
                          ? 'bg-civic-blue border-civic-blue text-white'
                          : 'border-border-default text-text-secondary hover:border-civic-blue/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full rounded-xl bg-civic-blue py-3 text-sm font-semibold text-white hover:bg-civic-blue-light disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Generating with Gemini 3.1 Pro...' : 'Generate My Checklist →'}
              </button>
            </motion.div>
          )}

          {/* Checklist */}
          {!showOnboarding && checklistItems.length > 0 && (
            <VoterChecklist items={checklistItems} />
          )}

          {isLoading && !showOnboarding && (
            <div className="glass-card p-8 text-center">
              <svg className="animate-spin h-6 w-6 text-civic-blue mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              <p className="text-text-secondary">Gemini 3.1 Pro is analyzing your situation...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
