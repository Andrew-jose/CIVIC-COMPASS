import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfidenceBar } from './ConfidenceBar';
import { SourceCitationPanel } from './SourceCitationPanel';

interface Verdict {
  verdict: 'True' | 'False' | 'Partially True' | 'Unverifiable';
  explanation: string;
  sources: Array<{ title: string; url: string; retrievedDate?: string }>;
  confidence: number;
}

interface FactCheckerProps {
  className?: string;
}

const VERDICT_STYLES = {
  'True':            { bg: 'bg-civic-green/15', border: 'border-civic-green/40', text: 'text-civic-green-light', icon: '✅' },
  'False':           { bg: 'bg-civic-red/15', border: 'border-civic-red/40', text: 'text-civic-red-light', icon: '❌' },
  'Partially True':  { bg: 'bg-civic-amber/15', border: 'border-civic-amber/40', text: 'text-civic-amber-light', icon: '⚠️' },
  'Unverifiable':    { bg: 'bg-surface-tertiary', border: 'border-border-default', text: 'text-text-muted', icon: '❓' },
};

/**
 * FactChecker — Claim submission → AI-powered verdict with Google Search grounding.
 * Verdicts: True / False / Partially True / Unverifiable.
 * Uses Gemini 3.1 Pro with combined tools for deep verification.
 */
export function FactChecker({ className = '' }: FactCheckerProps) {
  const [claim, setClaim] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!claim.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setVerdict(null);

    try {
      const response = await fetch('/api/v1/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim }),
      });

      if (!response.ok) throw new Error('Fact-check request failed');

      const data = await response.json();
      setVerdict(data.verdict);
    } catch (err: any) {
      setError(err.message || 'Failed to verify claim. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    if (!verdict) return;
    const shareText = `CIVIC COMPASS Fact Check:\n"${claim}"\nVerdict: ${verdict.verdict}\n${verdict.explanation}`;
    if (navigator.share) {
      navigator.share({ title: 'CIVIC COMPASS Fact Check', text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Input */}
      <div className="glass-card p-4">
        <label htmlFor="fact-check-input" className="block text-sm font-medium text-text-primary mb-2">
          Enter a civic claim to verify
        </label>
        <div className="flex gap-2">
          <input
            id="fact-check-input"
            type="text"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder='e.g., "The registration deadline in Texas is 30 days before the election"'
            className="flex-1 rounded-lg border border-border-default bg-surface-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-civic-blue transition-colors"
            disabled={isLoading}
            aria-label="Type a civic claim to fact-check"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !claim.trim()}
            className="rounded-lg bg-civic-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-civic-blue-light disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Verifying
              </span>
            ) : (
              '🔍 Verify'
            )}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Powered by Gemini 3.1 Pro with Google Search grounding and URL Context verification.
        </p>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-lg border border-civic-red/30 bg-civic-red/10 px-4 py-3 text-sm text-civic-red-light"
          role="alert"
        >
          {error}
        </motion.div>
      )}

      {/* Verdict Result */}
      <AnimatePresence>
        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Verdict badge */}
            <div className={`glass-card border ${VERDICT_STYLES[verdict.verdict].border} overflow-hidden`}>
              <div className={`${VERDICT_STYLES[verdict.verdict].bg} px-4 py-3 flex items-center gap-3`}>
                <span className="text-2xl">{VERDICT_STYLES[verdict.verdict].icon}</span>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Verdict</p>
                  <p className={`text-lg font-bold ${VERDICT_STYLES[verdict.verdict].text}`}>
                    {verdict.verdict}
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-text-secondary leading-relaxed">{verdict.explanation}</p>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="w-32">
                    <ConfidenceBar confidence={verdict.confidence} size="sm" />
                  </div>
                  <button
                    onClick={handleShare}
                    className="text-xs rounded-lg border border-border-default px-3 py-1.5 text-text-secondary hover:text-text-primary hover:border-civic-blue/50 transition-colors"
                  >
                    Share Fact Check
                  </button>
                </div>

                <SourceCitationPanel sources={verdict.sources} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example claims */}
      {!verdict && !isLoading && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">Try these example claims:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'You need a photo ID to vote in Texas',
              'Early voting starts 17 days before Election Day in most states',
              'You can register to vote on Election Day in all states',
            ].map((example) => (
              <button
                key={example}
                onClick={() => setClaim(example)}
                className="text-xs rounded-lg border border-border-default px-3 py-1.5 text-text-secondary hover:text-text-primary hover:border-civic-blue/50 transition-colors text-left"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
