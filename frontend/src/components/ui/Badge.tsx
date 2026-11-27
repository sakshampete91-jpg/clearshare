import React from 'react';

export type BadgeTone = 'neutral' | 'forest' | 'royal' | 'sage' | 'lavender' | 'warning' | 'error';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-warm-border bg-cream/70 text-ink',
  forest: 'border-forest bg-forest text-surface',
  royal: 'border-royal bg-royal text-surface',
  sage: 'border-[#B6D4BA] bg-sage text-forest-hover',
  lavender: 'border-[#C6B2DE] bg-lavender text-royal-hover',
  warning: 'border-[#E2C28E] bg-status-warning text-[#664212]',
  error: 'border-[#DFB3AC] bg-status-error text-[#732820]',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[tone]} ${className}`}
  >
    {children}
  </span>
);
