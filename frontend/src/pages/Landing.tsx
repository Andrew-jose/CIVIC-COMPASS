import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';

/**
 * Landing Page — The entry point for CIVIC COMPASS.
 * Features:
 *   - Hero section with animated tagline
 *   - Jurisdiction input (address → state + county)
 *   - Feature cards highlighting core capabilities
 *   - Language selector
 */
export function Landing() {
  const navigate = useNavigate();
  const { setJurisdiction, setSessionId } = useSessionStore();
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartJourney = async () => {
    if (!address.trim()) return;

    setIsLoading(true);
    try {
      // Create session
      const sessionRes = await fetch('/api/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.sessionId);

      // Resolve jurisdiction
      const jurisdictionRes = await fetch('/api/v1/jurisdiction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const jurisdictionData = await jurisdictionRes.json();
      setJurisdiction(jurisdictionData.jurisdiction);

      navigate('/journey');
    } catch (error) {
      console.error('Failed to start journey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: '💬',
      title: 'AI Election Guide',
      description: 'Get personalized, step-by-step guidance powered by Gemini 3 with zero-hallucination grounding.',
    },
    {
      icon: '📅',
      title: 'Election Timeline',
      description: 'See every key date for your jurisdiction — registration, early voting, Election Day, and more.',
    },
    {
      icon: '📋',
      title: 'Ballot Explainer',
      description: 'Upload your sample ballot and get plain-language explanations for every item.',
    },
    {
      icon: '✅',
      title: 'Voter Checklist',
      description: 'A personalized readiness checklist based on your situation and state requirements.',
    },
    {
      icon: '🔍',
      title: 'Fact Checker',
      description: 'Verify civic claims with AI-powered verdicts grounded in official sources.',
    },
    {
      icon: '🌐',
      title: '8 Languages',
      description: 'Full support for English, Spanish, French, Chinese, Hindi, Arabic, Portuguese, and Vietnamese.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Hero Section ─────────────────────────── */}
      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-24">
          {/* Background gradient orbs */}
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-civic-blue/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-civic-green/10 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-civic-blue/30 bg-civic-blue/10 px-4 py-1.5 text-sm text-civic-blue-light"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-civic-green animate-pulse" />
              Powered by Gemini 3 — Zero Hallucination Tolerance
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <span className="gradient-text">CIVIC COMPASS</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 text-lg text-text-secondary sm:text-xl lg:text-2xl"
            >
              Every citizen. Every election.{' '}
              <span className="text-civic-green-light font-semibold">Zero confusion.</span>
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-3 max-w-2xl mx-auto text-text-muted"
            >
              Your AI-powered guide through the entire election process — registration,
              candidates, ballots, deadlines, and more. Personalized to your exact jurisdiction.
            </motion.p>

            {/* Address Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 mx-auto max-w-xl"
            >
              <label htmlFor="address-input" className="sr-only">
                Enter your address
              </label>
              <div className="glass-card p-2 flex gap-2">
                <input
                  id="address-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartJourney()}
                  placeholder="Enter your address to get started..."
                  className="flex-1 bg-transparent px-4 py-3 text-text-primary placeholder:text-text-muted outline-none text-base"
                  aria-label="Enter your home address for personalized election information"
                />
                <button
                  onClick={handleStartJourney}
                  disabled={isLoading || !address.trim()}
                  className="rounded-xl bg-civic-blue px-6 py-3 font-semibold text-white transition-all hover:bg-civic-blue-light disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-civic-blue-light"
                  aria-label="Start your election journey"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Resolving...
                    </span>
                  ) : (
                    'Start My Journey →'
                  )}
                </button>
              </div>
              <p className="mt-3 text-xs text-text-muted text-center">
                Your address is used only to identify your election jurisdiction. We never store or share your physical address.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Features Grid ──────────────────────── */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                  className="glass-card p-6 hover:border-civic-blue/30 transition-colors"
                >
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust Bar ──────────────────────────── */}
        <section className="border-t border-border-subtle px-4 py-8">
          <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-civic-green" />
              Non-partisan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-civic-blue" />
              WCAG 2.2 AA Accessible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-civic-amber" />
              8 Languages Supported
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-text-muted" />
              Powered by Google Gemini 3
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
