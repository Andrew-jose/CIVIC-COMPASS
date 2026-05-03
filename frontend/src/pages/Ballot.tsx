import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BallotExplainer } from '../components/BallotExplainer';

/**
 * Ballot Page — Upload PDF ballot, get AI plain-language explanations.
 * Uses Gemini 3's native Document Processing + Google Search grounding.
 */

// Demo ballot items for when no real data is available
const DEMO_BALLOT_ITEMS = [
  {
    title: 'Proposition A — Public Transit Bond',
    type: 'bond' as const,
    summary: 'This measure would authorize the city to issue $2.5 billion in bonds to expand the public transit system, including new bus routes, light rail extensions, and station upgrades.',
    proPoints: [
      'Reduces traffic congestion by providing transit alternatives',
      'Creates an estimated 15,000 construction and operations jobs',
      'Improves air quality by reducing vehicle emissions',
    ],
    conPoints: [
      'Increases property taxes by an estimated $0.03 per $100 valuation',
      'Construction disruption in affected neighborhoods for 3-5 years',
      'No guarantee ridership targets will be met',
    ],
    fiscalImpact: 'Estimated annual cost: $180 million in debt service. Property tax increase of approximately $0.03 per $100 assessed value, or about $90/year for a $300,000 home.',
    passesEffect: 'The city would begin planning and construction of expanded transit lines within 18 months. Bond repayment over 30 years.',
    failsEffect: 'Current transit system remains unchanged. No new routes or station upgrades. Traffic congestion expected to worsen.',
    confidence: 85,
    sources: [{ title: 'City Transit Authority Bond Proposal', url: 'https://example.com/prop-a' }],
  },
  {
    title: 'Measure B — School Funding Amendment',
    type: 'amendment' as const,
    summary: 'Amends the state constitution to dedicate 2% of state sales tax revenue to public school infrastructure maintenance and teacher retention programs.',
    proPoints: [
      'Provides stable, dedicated funding for school repairs',
      'Includes teacher retention bonuses to address shortages',
      'Estimated $500M annually for school improvements',
    ],
    conPoints: [
      'Reduces general fund flexibility for legislature',
      'Constitutional amendments are difficult to modify later',
      'No sunset clause — permanent allocation regardless of needs',
    ],
    fiscalImpact: 'No new taxes. Redirects approximately $500 million annually from existing sales tax revenue to education infrastructure.',
    passesEffect: '2% of all state sales tax revenue would be constitutionally earmarked for school infrastructure and teacher programs.',
    failsEffect: 'School funding continues through annual legislative appropriations with no guaranteed minimum.',
    confidence: 78,
    sources: [{ title: 'State Education Board Analysis', url: 'https://example.com/measure-b' }],
  },
  {
    title: 'District 5 — City Council Representative',
    type: 'candidate' as const,
    summary: 'Two candidates are running for the District 5 City Council seat, representing approximately 85,000 residents. The term is 4 years.',
    confidence: 72,
    sources: [{ title: 'City Council District 5 Info', url: 'https://example.com/district-5' }],
  },
];

export function Ballot() {
  const [ballotItems] = useState(DEMO_BALLOT_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    try {
      // Upload to backend for Gemini 3 Document Processing
      const formData = new FormData();
      formData.append('ballot', file);

      const uploadRes = await fetch('/api/v1/ballot/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        // Get explanation
        const explainRes = await fetch('/api/v1/ballot/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ballotText: 'extracted content' }),
        });
        if (explainRes.ok) {
          const data = await explainRes.json();
          if (data.explanation) {
            // Parse structured response
            console.log('Ballot explained:', data);
          }
        }
      }
    } catch (error) {
      console.error('Ballot processing failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary">
      <header className="flex items-center justify-between border-b border-border-default px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/journey" className="text-text-muted hover:text-text-primary transition-colors">← Back</Link>
          <div className="h-5 w-px bg-border-default" />
          <h1 className="text-lg font-semibold gradient-text">Ballot Explainer</h1>
        </div>
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="text-xs rounded-lg border border-border-default px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors"
        >
          {showDemo ? 'Upload Ballot' : 'View Demo'}
        </button>
      </header>

      <main id="main-content" className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {!showDemo ? (
            <BallotExplainer onUpload={handleUpload} isLoading={isLoading} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="glass-card p-4 mb-4 text-center">
                <p className="text-xs text-text-muted">
                  📋 Demo ballot items — upload your real ballot PDF for personalized analysis.
                </p>
              </div>
              <BallotExplainer items={ballotItems} onUpload={handleUpload} />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
