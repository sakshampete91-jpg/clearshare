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
  ShieldCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../app/AppContext';
import type { ScreenId } from '../../types/clearshare';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenLog: () => void;
  onOpenInfo: () => void;
}

export const SCREEN_META: Record<
  ScreenId,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  workspace: {
    label: 'Workspace',
    description: 'Upload or paste sensitive documents and inspect live sanitization',
    icon: FileText,
  },
  analysis: {
    label: 'Document Analysis',
    description: 'Inspect detected identifiers, confidence, and validation notes',
    icon: SearchCheck,
  },
  simulator: {
    label: 'Privacy Simulator',
    description: 'Explore masking, partial masking, and pseudonymization tradeoffs',
    icon: ShieldAlert,
  },
  comparison: {
    label: 'Compare & Review',
    description: 'Synchronized original vs sanitized view and residual exposure',
    icon: Columns2,
  },
  verification: {
    label: 'Verification & Reporting',
    description: 'Independent re-analysis of transformed output and honest status',
    icon: ShieldCheck,
  },
  export: {
    label: 'Export',
    description: 'Download verified sanitized TXT/CSV and analysis reports',
    icon: Download,
  },
};

const NAV_ORDER: ScreenId[] = [
  'workspace',
  'analysis',
  'simulator',
  'comparison',
  'verification',
  'export',
];

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  onOpenLog,
  onOpenInfo,
}) => {
  const { activeScreen, setActiveScreen, activityLog } = useApp();

  const handleSelect = (id: ScreenId) => {
    setActiveScreen(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-surface p-4">
      <div className="space-y-5">
        {/* Brand Identity */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSelect('workspace')}
            className="cs-focus-ring flex items-center gap-2.5 rounded-lg text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest text-cream">
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
            <div>
              <div className="font-heading text-base font-bold tracking-tight text-ink">
                CLEARSHARE
              </div>
              <div className="text-[11px] leading-tight text-subtle">
                Privacy Intelligence
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="cs-focus-ring rounded-lg border border-warm-border p-1.5 text-muted hover:bg-cream lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Primary areas" className="space-y-1">
          {NAV_ORDER.map((id) => {
            const meta = SCREEN_META[id];
            const Icon = meta.icon;
            const isActive = activeScreen === id;
            const isIntelligence = id === 'simulator' || id === 'verification';

            const activeClass = isIntelligence
              ? 'bg-lavender text-royal border-[#C6B2DE]'
              : 'bg-sage text-forest border-[#B6D4BA]';

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`cs-focus-ring flex min-h-[40px] w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  isActive
                    ? activeClass
                    : 'border-transparent text-muted hover:bg-cream/80 hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Privacy Assurance & Utilities */}
      <div className="space-y-2.5 border-t border-warm-border pt-4">
        <div className="rounded-xl border border-[#B6D4BA] bg-sage/45 p-3 text-[11px] leading-relaxed text-forest-hover">
          <div className="flex items-center gap-1.5 font-semibold">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Browser-Only Processing</span>
          </div>
          <p className="mt-1 text-[11px] opacity-90">
            Documents stay in local memory. Zero server uploads or AI API calls.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenLog}
            aria-label={`Open Activity Log (${activityLog.length} events)`}
            className="cs-focus-ring flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-warm-border bg-surface px-2.5 text-xs font-medium text-ink hover:bg-cream"
          >
            <History className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
            <span>Activity</span>
            <span className="rounded-full bg-lavender px-1.5 py-0.5 text-[10px] font-semibold text-royal">
              {activityLog.length}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenInfo}
            aria-label="Privacy and detection methodology"
            className="cs-focus-ring flex min-h-[36px] items-center justify-center gap-1 rounded-lg border border-warm-border bg-surface px-2.5 text-xs font-medium text-muted hover:bg-cream hover:text-ink"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Scope</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar (248px) */}
      <aside className="hidden w-[248px] shrink-0 border-r border-warm-border bg-surface lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{navContent}</div>
      </aside>

      {/* Mobile / Tablet Collapsible Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex bg-ink/40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onClick={onCloseMobile}
        >
          <aside
            className="h-full w-[264px] border-r border-warm-border bg-surface shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
