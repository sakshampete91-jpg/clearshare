import React from 'react';
import {
  FileText,
  SearchCheck,
  ShieldAlert,
  Columns2,
  Download,
  Lock,
  History,
} from 'lucide-react';
import { useApp } from '../../app/AppContext';
import type { ScreenId } from '../../types/clearshare';
import { SANITIZATION_MODE_META } from '../../utils/categoryMeta';

interface TopNavProps {
  onOpenLog: () => void;
}

const NAV_ITEMS: { id: ScreenId; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'workspace', label: '1. Workspace', shortLabel: 'Workspace', icon: FileText },
  { id: 'analysis', label: '2. Analysis Studio', shortLabel: 'Analysis', icon: SearchCheck },
  { id: 'simulator', label: '3. Exposure Simulator', shortLabel: 'Simulator', icon: ShieldAlert },
  { id: 'comparison', label: '4. Comparison Studio', shortLabel: 'Compare', icon: Columns2 },
  { id: 'export', label: '5. Review & Export', shortLabel: 'Export', icon: Download },
];

export const TopNav: React.FC<TopNavProps> = ({ onOpenLog }) => {
  const { activeScreen, setActiveScreen, sanitizationMode, activityLog } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-[#E8E2D8] bg-[#FFFFFF]/95 backdrop-blur-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Row: Brand + Mode + Privacy Badge + Activity Log */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <button
            type="button"
            onClick={() => setActiveScreen('workspace')}
            className="cs-focus-ring flex items-center gap-3 rounded-lg text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#285C43] text-[#F5F0E6]">
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
                <path
                  d="M16 4L25 8V15.5C25 21.1 21.2 25.9 16 28C10.8 25.9 7 21.1 7 15.5V8L16 4Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="15.5" r="3.2" fill="#EAE2F2" stroke="#60418A" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[#26352D]">
                  CLEARSHARE
                </span>
                <span className="hidden rounded-full bg-[#DCE9DD] px-2.5 py-0.5 text-xs font-medium text-[#285C43] sm:inline-block">
                  Privacy Intelligence
                </span>
              </div>
              <p className="text-xs text-[#5B6058]">
                Know what your data reveals before you share it.
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-full border border-[#B6D4BA] bg-[#DCE9DD] px-3 py-1.5 text-xs font-medium text-[#204B36]"
              title="All analysis and sanitization run strictly in your browser memory."
            >
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Local Browser Only</span>
            </div>

            <div className="hidden rounded-full border border-[#E8E2D8] bg-[#F5F0E6] px-3 py-1.5 text-xs font-medium text-[#26352D] md:block">
              Mode: {SANITIZATION_MODE_META[sanitizationMode].shortName}
            </div>

            <button
              type="button"
              onClick={onOpenLog}
              className="cs-focus-ring inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#26352D] hover:bg-[#F5F0E6]"
              aria-label={`Open Activity Log (${activityLog.length} events)`}
            >
              <History className="h-3.5 w-3.5 text-[#60418A]" aria-hidden="true" />
              <span>Activity Log</span>
              <span className="rounded-full bg-[#EAE2F2] px-1.5 py-0.5 text-[11px] font-semibold text-[#60418A]">
                {activityLog.length}
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs across the 5 primary screens */}
        <nav aria-label="Primary screens" className="-mb-px flex gap-1 overflow-x-auto pb-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            const isSimulator = item.id === 'simulator';

            let activeStyle = 'border-[#285C43] bg-[#DCE9DD]/55 text-[#285C43]';
            if (isActive && isSimulator) {
              activeStyle = 'border-[#60418A] bg-[#EAE2F2]/70 text-[#60418A]';
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`cs-focus-ring inline-flex min-h-[44px] shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? activeStyle
                    : 'border-transparent text-[#5B6058] hover:border-[#E8E2D8] hover:text-[#26352D]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
