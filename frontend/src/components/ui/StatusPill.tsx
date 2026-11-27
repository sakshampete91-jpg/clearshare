import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { VerificationStatus } from '../../types/clearshare';

interface StatusPillProps {
  status: VerificationStatus;
}

const STATUS_MAP: Record<
  VerificationStatus,
  { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  'Not yet analysed': {
    label: 'Not yet analysed',
    classes: 'border-warm-border bg-cream text-muted',
    Icon: Clock,
  },
  Processing: {
    label: 'Processing',
    classes: 'border-[#C6B2DE] bg-lavender text-royal-hover',
    Icon: Loader2,
  },
  'Verification required': {
    label: 'Verification required',
    classes: 'border-[#E2C28E] bg-status-warning text-[#664212]',
    Icon: AlertTriangle,
  },
  'Exposure detected': {
    label: 'Exposure detected',
    classes: 'border-[#DFB3AC] bg-status-error text-[#732820]',
    Icon: ShieldAlert,
  },
  'Residual exposure detected': {
    label: 'Residual exposure detected',
    classes: 'border-[#E2C28E] bg-status-warning text-[#664212]',
    Icon: AlertTriangle,
  },
  'No supported patterns detected': {
    label: 'No supported patterns detected',
    classes: 'border-[#B6D4BA] bg-sage text-forest-hover',
    Icon: ShieldCheck,
  },
  'Verification failed': {
    label: 'Verification failed',
    classes: 'border-[#DFB3AC] bg-status-error text-[#732820]',
    Icon: AlertCircle,
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const cfg = STATUS_MAP[status];
  const Icon = cfg.Icon;
  const spin = status === 'Processing' ? 'animate-spin' : '';

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.classes}`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${spin}`} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
};

export const VerifiedIndicator: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-hover">
    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-forest" aria-hidden="true" />
    <span>{label}</span>
  </span>
);
