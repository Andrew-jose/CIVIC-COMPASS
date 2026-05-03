import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Milestone {
  id: string;
  title: string;
  date: string;
  description: string;
  actionRequired?: string;
  status: 'upcoming' | 'urgent' | 'today' | 'passed';
  priority?: 'critical' | 'important' | 'optional';
}

interface ElectionTimelineProps {
  milestones: Milestone[];
  nextDeadline?: { title: string; date: string; daysUntil: number };
  onSetReminder?: (milestone: Milestone) => void;
}

const STATUS_STYLES = {
  upcoming: { dot: 'bg-civic-blue', ring: 'ring-civic-blue/30', badge: 'bg-civic-blue/20 text-civic-blue-light', label: 'Upcoming' },
  urgent:   { dot: 'bg-civic-amber', ring: 'ring-civic-amber/30', badge: 'bg-civic-amber/20 text-civic-amber-light', label: 'Urgent' },
  today:    { dot: 'bg-civic-green', ring: 'ring-civic-green/30', badge: 'bg-civic-green/20 text-civic-green-light', label: 'Today' },
  passed:   { dot: 'bg-text-muted', ring: 'ring-text-muted/20', badge: 'bg-surface-tertiary text-text-muted', label: 'Passed' },
};

/**
 * ElectionTimeline — Vertical stepped timeline with clickable milestones.
 * Color-coded: upcoming=blue, urgent=amber, today=pulsing green, passed=gray.
 * Click milestone → detail drawer with explanation + "Set Reminder" (.ics).
 */
export function ElectionTimeline({ milestones, nextDeadline }: ElectionTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const generateICS = (milestone: Milestone) => {
    const date = new Date(milestone.date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dtStart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CIVIC COMPASS//EN',
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${dtStart}`,
      `SUMMARY:${milestone.title}`,
      `DESCRIPTION:${milestone.description}${milestone.actionRequired ? '\\n\\nAction: ' + milestone.actionRequired : ''}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civic-compass-${milestone.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-6">
      {/* Countdown banner */}
      {nextDeadline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Next Deadline</p>
            <p className="text-lg font-semibold text-text-primary">{nextDeadline.title}</p>
            <p className="text-sm text-text-secondary">{formatDate(nextDeadline.date)}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold gradient-text">{nextDeadline.daysUntil}</p>
            <p className="text-xs text-text-muted">days left</p>
          </div>
        </motion.div>
      )}

      {/* Timeline */}
      <div className="relative" role="list" aria-label="Election timeline milestones">
        {/* Vertical connector line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 timeline-connector" aria-hidden="true" />

        {milestones.map((milestone, index) => {
          const style = STATUS_STYLES[milestone.status];
          const isSelected = selectedId === milestone.id;

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative flex gap-4 pb-6 last:pb-0"
              role="listitem"
            >
              {/* Dot */}
              <div className="relative z-10 flex-shrink-0 mt-1">
                <button
                  onClick={() => setSelectedId(isSelected ? null : milestone.id)}
                  className={`w-[30px] h-[30px] rounded-full ${style.dot} ring-4 ${style.ring} flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${milestone.status === 'today' ? 'milestone-pulse' : ''}`}
                  aria-expanded={isSelected}
                  aria-label={`${milestone.title} — ${style.label}. Click for details.`}
                >
                  {milestone.status === 'passed' && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`glass-card p-4 cursor-pointer hover:border-civic-blue/40 transition-colors ${isSelected ? 'border-civic-blue/50' : ''}`}
                  onClick={() => setSelectedId(isSelected ? null : milestone.id)}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary text-sm sm:text-base">
                        {milestone.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">{formatDate(milestone.date)}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.badge} flex-shrink-0`}>
                      {style.label}
                    </span>
                  </div>

                  {/* Expanded detail drawer */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-border-default space-y-2">
                          <p className="text-sm text-text-secondary leading-relaxed">{milestone.description}</p>
                          {milestone.actionRequired && (
                            <div className="rounded-lg bg-civic-blue/10 border border-civic-blue/20 px-3 py-2">
                              <p className="text-xs font-semibold text-civic-blue-light mb-0.5">What You Need To Do:</p>
                              <p className="text-sm text-text-primary">{milestone.actionRequired}</p>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); generateICS(milestone); }}
                              className="text-xs rounded-lg border border-border-default px-3 py-1.5 text-text-secondary hover:text-text-primary hover:border-civic-blue/50 transition-colors"
                              aria-label={`Set reminder for ${milestone.title}`}
                            >
                              📅 Set Reminder (.ics)
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
