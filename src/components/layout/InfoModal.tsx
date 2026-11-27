import React, { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#26352D]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="cs-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCE9DD] text-[#285C43]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="info-modal-title" className="text-base font-semibold text-[#26352D]">
                How CLEARSHARE Works
              </h2>
              <p className="text-xs text-[#5B6058]">Client-side privacy & detection scope</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close methodology dialog"
            className="cs-focus-ring rounded-lg border border-[#E8E2D8] p-1.5 text-[#5B6058] hover:bg-[#F5F0E6]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#5B6058]">
          <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/50 p-3.5">
            <p className="font-semibold text-[#26352D]">1. Zero External Transmission</p>
            <p className="mt-1">
              All text scanning, CSV cell parsing, pseudonymization, and exposure simulation run
              strictly in your browser&apos;s temporary memory. No document data is ever sent to a
              server, external AI API, or browser storage (`localStorage`/`sessionStorage`).
            </p>
          </div>

          <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/50 p-3.5">
            <p className="font-semibold text-[#26352D]">2. Honest Validation Boundaries</p>
            <ul className="mt-1 space-y-1">
              <li>• <strong>PAN & Aadhaar-like IDs:</strong> Format/boundary checks only — never establishes government-issued or UIDAI validity.</li>
              <li>• <strong>Payment Cards:</strong> Luhn checksum verifies digit math, not whether a card is active or genuine.</li>
              <li>• <strong>IPv4:</strong> Octets are strictly validated between 0 and 255.</li>
              <li>• <strong>API Keys:</strong> Not auto-detected by pattern; use Custom Sensitive Phrases for secrets.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#D2C2E4] bg-[#EAE2F2]/40 p-3.5">
            <p className="font-semibold text-[#4E3471]">3. Privacy Exposure Simulator</p>
            <p className="mt-1">
              Independently scans the already-sanitized output for remaining direct identifiers,
              indirect clues (locations, dates, ticket/account IDs, organizations, names), and
              linkable combinations. Exposure levels are transparent rule-based indicators, not a
              guarantee of anonymity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
