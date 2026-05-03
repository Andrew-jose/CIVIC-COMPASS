import { Link } from 'react-router-dom';
import { FactChecker } from '../components/FactChecker';

/**
 * FactCheck Page — Verify civic claims with Gemini 3.1 Pro.
 * Uses Google Search grounding + URL Context + Structured Output.
 */
export function FactCheck() {
  return (
    <div className="min-h-screen bg-surface-primary">
      <header className="flex items-center gap-3 border-b border-border-default px-4 py-3 sm:px-6">
        <Link to="/journey" className="text-text-muted hover:text-text-primary transition-colors">← Back</Link>
        <div className="h-5 w-px bg-border-default" />
        <h1 className="text-lg font-semibold gradient-text">Civic Fact Checker</h1>
      </header>
      <main id="main-content" className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <FactChecker />
        </div>
      </main>
    </div>
  );
}
