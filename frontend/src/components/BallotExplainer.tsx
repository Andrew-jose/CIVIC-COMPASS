import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfidenceBar } from './ConfidenceBar';
import { SourceCitationPanel } from './SourceCitationPanel';

interface BallotItem {
  title: string;
  type: 'candidate' | 'measure' | 'amendment' | 'bond';
  summary: string;
  proPoints?: string[];
  conPoints?: string[];
  fiscalImpact?: string;
  passesEffect?: string;
  failsEffect?: string;
  officialUrl?: string;
  confidence: number;
  sources: Array<{ title: string; url: string }>;
}

interface BallotExplainerProps {
  items?: BallotItem[];
  isLoading?: boolean;
  onUpload?: (file: File) => void;
  onShare?: (item: BallotItem) => void;
}

/**
 * BallotExplainer — PDF upload → AI plain-language ballot breakdown.
 * Each item shows: summary, pro/con, fiscal impact, pass/fail effects,
 * confidence score, source citations, and share button.
 */
export function BallotExplainer({ items, isLoading = false, onUpload, onShare }: BallotExplainerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') onUpload?.(file);
  }, [onUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload?.(file);
  };

  const TYPE_LABELS = {
    candidate: { label: 'Candidate', color: 'bg-civic-blue/20 text-civic-blue-light' },
    measure: { label: 'Measure', color: 'bg-civic-green/20 text-civic-green-light' },
    amendment: { label: 'Amendment', color: 'bg-civic-amber/20 text-civic-amber-light' },
    bond: { label: 'Bond', color: 'bg-surface-tertiary text-text-secondary' },
  };

  // Upload zone (shown when no items)
  if (!items || items.length === 0) {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`glass-card border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
            isDragOver ? 'border-civic-blue bg-civic-blue/5' : 'border-border-default hover:border-civic-blue/50'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Drop or click to upload ballot PDF"
          onClick={() => document.getElementById('ballot-file-input')?.click()}
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('ballot-file-input')?.click()}
        >
          <input id="ballot-file-input" type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          <div className="text-5xl mb-4">{isDragOver ? '📥' : '📄'}</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {isDragOver ? 'Drop your ballot here' : 'Upload Your Sample Ballot'}
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Drag and drop your sample ballot PDF, or click to browse.
            Gemini 3 will analyze each item and explain it in plain language.
          </p>
          <p className="text-xs text-text-muted mt-3">PDF files only • Max 10MB</p>
        </div>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5 text-civic-blue" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              <span className="text-text-secondary">Analyzing ballot with Gemini 3.1 Pro...</span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Results view
  return (
    <div className="space-y-3" role="list" aria-label="Ballot items explained">
      {items.map((item, index) => {
        const typeInfo = TYPE_LABELS[item.type];
        const isExpanded = expandedId === index;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="glass-card overflow-hidden"
            role="listitem"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : index)}
              className="w-full p-4 text-left flex items-start gap-3 hover:bg-surface-tertiary/30 transition-colors"
              aria-expanded={isExpanded}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  {item.confidence < 60 && (
                    <span className="text-xs text-civic-amber">⚠️ Low confidence</span>
                  )}
                </div>
                <h3 className="font-semibold text-text-primary text-sm sm:text-base">{item.title}</h3>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">{item.summary}</p>
              </div>
              <svg
                className={`w-4 h-4 text-text-muted flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-border-default pt-3">
                    <p className="text-sm text-text-secondary leading-relaxed">{item.summary}</p>

                    {/* Pro / Con */}
                    {(item.proPoints?.length || item.conPoints?.length) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.proPoints && item.proPoints.length > 0 && (
                          <div className="rounded-lg bg-civic-green/10 border border-civic-green/20 p-3">
                            <p className="text-xs font-semibold text-civic-green-light mb-1.5">Arguments For</p>
                            <ul className="space-y-1">
                              {item.proPoints.map((p, i) => (
                                <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                                  <span className="text-civic-green flex-shrink-0">+</span>{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.conPoints && item.conPoints.length > 0 && (
                          <div className="rounded-lg bg-civic-red/10 border border-civic-red/20 p-3">
                            <p className="text-xs font-semibold text-civic-red-light mb-1.5">Arguments Against</p>
                            <ul className="space-y-1">
                              {item.conPoints.map((p, i) => (
                                <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                                  <span className="text-civic-red flex-shrink-0">−</span>{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fiscal + Pass/Fail */}
                    {item.fiscalImpact && (
                      <div className="rounded-lg bg-civic-amber/10 border border-civic-amber/20 p-3">
                        <p className="text-xs font-semibold text-civic-amber-light mb-0.5">Fiscal Impact</p>
                        <p className="text-xs text-text-secondary">{item.fiscalImpact}</p>
                      </div>
                    )}

                    {(item.passesEffect || item.failsEffect) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.passesEffect && (
                          <div className="rounded-lg bg-surface-tertiary p-3">
                            <p className="text-xs font-semibold text-civic-green-light mb-0.5">If It Passes</p>
                            <p className="text-xs text-text-secondary">{item.passesEffect}</p>
                          </div>
                        )}
                        {item.failsEffect && (
                          <div className="rounded-lg bg-surface-tertiary p-3">
                            <p className="text-xs font-semibold text-civic-red-light mb-0.5">If It Fails</p>
                            <p className="text-xs text-text-secondary">{item.failsEffect}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Confidence + Sources + Actions */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="w-32"><ConfidenceBar confidence={item.confidence} size="sm" /></div>
                      <button
                        onClick={() => onShare?.(item)}
                        className="text-xs rounded-lg border border-border-default px-3 py-1.5 text-text-secondary hover:text-text-primary hover:border-civic-blue/50 transition-colors"
                      >
                        Share Explanation
                      </button>
                    </div>
                    <SourceCitationPanel sources={item.sources} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
