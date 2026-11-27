import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../app/AppContext';

interface ActivityLogDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({ open, onClose }) => {
  const { activityLog } = useApp();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[#26352D]/35"
      role="dialog"
      aria-modal="true"
      aria-label="Local Activity Log"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-[#E8E2D8] bg-[#FFFFFF]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E8E2D8] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#26352D]">Local Activity Log</h2>
            <p className="text-xs text-[#5B6058]">
              Records application actions only — never document text or PII.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cs-focus-ring flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8E2D8] text-[#26352D] hover:bg-[#F5F0E6]"
            aria-label="Close activity log"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-[#E8E2D8] bg-[#DCE9DD]/50 px-5 py-2.5 text-xs text-[#204B36]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            All events occur locally in browser memory.
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activityLog.length === 0 ? (
            <p className="text-sm text-[#5B6058]">No actions recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {activityLog.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/50 px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#26352D]">{entry.action}</span>
                    <time className="text-[11px] font-medium text-[#5B6058]">
                      {entry.timestamp}
                    </time>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5B6058]">{entry.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};
