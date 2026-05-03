import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Source {
  title: string;
  url: string;
  retrievedDate?: string;
}

interface SourceCitationPanelProps {
  sources: Source[];
  className?: string;
}

/**
 * SourceCitationPanel — Collapsible panel showing sources from groundingMetadata.
 * Every AI response should include citations for full transparency.
 */
export function SourceCitationPanel({ sources, className = '' }: SourceCitationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={`mt-2 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-civic-blue-light hover:text-civic-blue transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-blue rounded px-1 py-0.5"
        aria-expanded={isOpen}
        aria-controls="source-panel"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="source-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="mt-1.5 space-y-1 border-l-2 border-civic-blue/30 pl-3" role="list" aria-label="Citation sources">
              {sources.map((source, i) => (
                <li key={i} className="text-xs">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civic-blue-light hover:text-white transition-colors underline underline-offset-2"
                  >
                    {source.title || source.url}
                  </a>
                  {source.retrievedDate && (
                    <span className="text-text-muted ml-1">
                      · {new Date(source.retrievedDate).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
