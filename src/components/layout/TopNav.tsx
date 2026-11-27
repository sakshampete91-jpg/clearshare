import React from 'react';
import { History, Info, Lock } from 'lucide-react';
import { useApp } from '../../app/AppContext';

interface TopNavProps {
  onOpenLog: () => void;
  onOpenInfo: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenLog, onOpenInfo }) => {
  const { activityLog } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-[#E8E2D8] bg-[#FFFFFF]/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/* Brand & Short Descriptor */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#285C43] text-[#F5F0E6]">
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M16 4L25 8V15.5C25 21.1 21.2 25.9 16 28C10.8 25.9 7 21.1 7 15.5V8L16 4Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="15.5" r="3.2" fill="#EAE2F2" stroke="#60418A" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-base font-bold tracking-tight text-[#26352D]">
              CLEARSHARE
            </span>
            <span className="hidden truncate text-xs text-[#5B6058] sm:inline">
              Know what your data reveals before you share it.
            </span>
          </div>
        </div>

        {/* Single Local Indicator + Minimal Utilities */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[#B6D4BA] bg-[#DCE9DD]/75 px-2.5 py-1 text-[11px] font-medium text-[#204B36]"
            title="All detection, sanitization, and exposure simulation execute strictly inside browser memory."
          >
            <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Local Processing</span>
          </span>

          <button
            type="button"
            onClick={onOpenLog}
            aria-label={`Open Activity Log (${activityLog.length} events)`}
            className="cs-focus-ring inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#26352D] hover:bg-[#F5F0E6]"
          >
            <History className="h-3.5 w-3.5 text-[#60418A]" aria-hidden="true" />
            <span className="hidden md:inline">Activity</span>
            <span className="rounded-full bg-[#EAE2F2] px-1.5 py-0.5 text-[10px] font-semibold text-[#60418A]">
              {activityLog.length}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenInfo}
            aria-label="Privacy and detection methodology"
            className="cs-focus-ring inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] text-[#5B6058] hover:bg-[#F5F0E6] hover:text-[#26352D]"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
