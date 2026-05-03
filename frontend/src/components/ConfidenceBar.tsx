import { motion } from 'framer-motion';

interface ConfidenceBarProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ConfidenceBar — Visual indicator (0–100%) for AI response grounding quality.
 * Color-coded: green ≥ 80, amber ≥ 50, red < 50.
 */
export function ConfidenceBar({ confidence, showLabel = true, size = 'md' }: ConfidenceBarProps) {
  const clampedConfidence = Math.max(0, Math.min(100, confidence));

  const getColor = () => {
    if (clampedConfidence >= 80) return { bar: 'confidence-high', text: 'text-civic-green', label: 'High confidence' };
    if (clampedConfidence >= 50) return { bar: 'confidence-medium', text: 'text-civic-amber', label: 'Moderate confidence' };
    return { bar: 'confidence-low', text: 'text-civic-red', label: 'Low confidence' };
  };

  const colors = getColor();
  const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

  return (
    <div className="flex items-center gap-2" role="meter" aria-valuenow={clampedConfidence} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence: ${clampedConfidence}%`}>
      <div className={`confidence-bar flex-1 ${heights[size]}`}>
        <motion.div
          className={`confidence-fill ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedConfidence}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${colors.text} whitespace-nowrap`}>
          {clampedConfidence}%
        </span>
      )}
      {clampedConfidence < 60 && showLabel && (
        <span className="text-xs text-civic-amber" title="Verify with official sources">⚠️</span>
      )}
    </div>
  );
}
