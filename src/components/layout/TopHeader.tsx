import React from 'react';
import { ArrowRight, Menu } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { SCREEN_META } from './Sidebar';
import { StatusPill } from '../ui/StatusPill';

interface TopHeaderProps {
  onOpenMobileNav: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileNav }) => {
  const {
    activeScreen,
    setActiveScreen,
    verificationStatus,
    hasAnalyzed,
    rawText,
  } = useApp();

  const meta = SCREEN_META[activeScreen];

  return (
    <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between gap-3 border-b border-warm-border bg-surface/95 px-4 py-2.5 backdrop-blur-xs sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="cs-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-warm-border bg-surface text-ink hover:bg-cream lg:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-subtle">
            <span>CLEARSHARE</span>
            <span>/</span>
            <span className="text-ink">{meta.label}</span>
          </div>
          <p className="truncate text-xs text-muted">{meta.description}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <StatusPill status={verificationStatus} />

        {activeScreen !== 'export' && hasAnalyzed && rawText.trim() && (
          <button
            type="button"
            onClick={() => setActiveScreen('export')}
            className="cs-focus-ring hidden min-h-[36px] items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-surface hover:bg-forest-hover sm:inline-flex"
          >
            <span>Go to Export</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
};
