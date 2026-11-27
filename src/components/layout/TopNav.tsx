import React from 'react';
import {
  Columns2,
  Download,
  FileText,
  History,
  Info,
  Lock,
  SearchCheck,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../app/AppContext';
import type { ScreenId } from '../../types/clearshare';
import { StatusPill } from '../ui/StatusPill';

interface TopNavProps {
  onOpenLog: () => void;
  onOpenInfo: () => void;
}

const NAV_ITEMS: {
  id: ScreenId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'workspace', label: 'Workspace', shortLabel: 'Workspace', icon: FileText },
  { id: 'analysis', label: 'Document Analysis', shortLabel: 'Analysis', icon: SearchCheck },
  { id: 'simulator', label: 'Privacy Simulator', shortLabel: 'Simulator', icon: ShieldAlert },
  { id: 'comparison', label: 'Comparison & Review', shortLabel: 'Compare', icon: Columns2 },
  { id: 'export', label: 'Export & Reporting', shortLabel: 'Export', icon: Download },
];

export const TopNav: React.FC<TopNavProps> = ({ onOpenLog, onOpenInfo }) => {
  const { activeScreen, setActiveScreen, activityLog, verificationStatus } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-warm-border bg-surface/95 backdrop-blur-xs">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        {/* Compact Brand & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2">
          <button
            type="button"
            onClick={() => setActiveScreen('workspace')}
            className="cs-focus-ring flex min-w-0 items-center gap-2.5 rounded-lg text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest text-cream">
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
                <path
                  d="M16 4L25 8V15.5C25 21.1 21.2 25.9 16 28C10.8 25.9 7 21.1 7 15.5V8L16 4Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <circle
                  cx="16"
                  cy="15.5"
                  r="3.2"
                  fill="#EAE2F2"
                  stroke="#60418A"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
              <span className="text-base font-bold tracking-tight text-ink">CLEARSHARE</span>
              <span className="hidden truncate text-xs text-muted lg:inline">
                Know what your data reveals before you share it.
              </span>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={verificationStatus} />

            <span
              className="hidden items-center gap-1.5 rounded-full border border-[#B6D4BA] bg-sage/75 px-2.5 py-1 text-[11px] font-medium text-forest-hover sm:inline-flex"
              title="All detection, sanitization, verification, and simulation run strictly in browser memory."
            >
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Local Processing</span>
            </span>

            <button
              type="button"
              onClick={onOpenLog}
              aria-label={`Open Activity Log (${activityLog.length} events)`}
              className="cs-focus-ring inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-warm-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream"
            >
              <History className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
              <span className="hidden md:inline">Activity</span>
              <span className="rounded-full bg-lavender px-1.5 py-0.5 text-[10px] font-semibold text-royal">
                {activityLog.length}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenInfo}
              aria-label="Privacy and detection methodology"
              className="cs-focus-ring inline-flex h-[32px] w-[32px] items-center justify-center rounded-lg border border-warm-border bg-surface text-muted hover:bg-cream hover:text-ink"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Editorial 5-Area Navigation */}
        <nav aria-label="Primary areas" className="-mb-px flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            const isSim = item.id === 'simulator';

            const activeClasses = isSim
              ? 'border-royal bg-lavender/65 text-royal'
              : 'border-forest bg-sage/55 text-forest';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`cs-focus-ring inline-flex min-h-[38px] shrink-0 items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? activeClasses
                    : 'border-transparent text-muted hover:border-warm-border hover:text-ink'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
