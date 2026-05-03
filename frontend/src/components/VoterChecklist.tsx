import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';
import type { ChecklistItem } from '../store/useSessionStore';

interface VoterChecklistProps {
  items: ChecklistItem[];
  onToggle?: (id: string) => void;
}

const PRIORITY_STYLES = {
  critical:  { badge: 'bg-civic-red/20 text-civic-red-light', icon: '🔴', border: 'border-l-civic-red' },
  important: { badge: 'bg-civic-amber/20 text-civic-amber-light', icon: '🟡', border: 'border-l-civic-amber' },
  optional:  { badge: 'bg-civic-blue/20 text-civic-blue-light', icon: '🔵', border: 'border-l-civic-blue' },
};

/**
 * VoterChecklist — Dynamic AI-generated checklist with completion tracking.
 * Features: checkable items, priority badges, circular progress ring,
 * deadline display, and official resource links.
 */
export function VoterChecklist({ items, onToggle }: VoterChecklistProps) {
  const { toggleChecklistItem } = useSessionStore();

  const handleToggle = (id: string) => {
    toggleChecklistItem(id);
    onToggle?.(id);
  };

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // SVG circular progress ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Progress Ring */}
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label={`${percentage}% complete`}>
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-surface-tertiary)" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r={radius} fill="none"
              stroke={percentage === 100 ? 'var(--color-civic-green)' : 'var(--color-civic-blue)'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
              className="fill-text-primary text-xl font-bold" style={{ fontSize: '20px' }}>
              {percentage}%
            </text>
          </svg>
          {percentage === 100 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 text-2xl"
            >
              🎉
            </motion.div>
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">
            {completedCount} of {totalCount} completed
          </p>
          <p className="text-sm text-text-secondary">
            {percentage === 100
              ? "You're all set for Election Day!"
              : `${totalCount - completedCount} item${totalCount - completedCount !== 1 ? 's' : ''} remaining`
            }
          </p>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2" role="list" aria-label="Voter readiness checklist">
        {items.map((item, index) => {
          const priority = PRIORITY_STYLES[item.priority];

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`glass-card border-l-4 ${priority.border} p-4 ${item.completed ? 'opacity-60' : ''}`}
              role="listitem"
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <label className="flex-shrink-0 mt-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggle(item.id)}
                    className="sr-only peer"
                    aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    item.completed
                      ? 'bg-civic-green border-civic-green'
                      : 'border-border-default hover:border-civic-blue'
                  }`}>
                    {item.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </label>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-medium text-sm ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                      {item.title}
                    </h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priority.badge}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">{item.description}</p>
                  {item.whyItMatters && (
                    <p className="text-xs text-text-muted mt-1 italic">Why it matters: {item.whyItMatters}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {item.deadline && (
                      <span className="text-xs text-civic-amber flex items-center gap-1">
                        📅 {item.deadline}
                      </span>
                    )}
                    {item.officialUrl && (
                      <a
                        href={item.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-civic-blue-light hover:text-white underline underline-offset-2 transition-colors"
                      >
                        Official resource →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
