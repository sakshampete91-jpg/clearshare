import React from 'react';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import type { AppErrorInfo } from '../../types/clearshare';

interface ErrorAlertProps {
  error: AppErrorInfo;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => (
  <div
    role="alert"
    className="rounded-xl border border-[#DFB3AC] bg-status-error/85 p-3.5 text-xs text-[#732820]"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <div className="font-semibold">
            {error.operation} failed: {error.whatHappened}
          </div>
          <p className="text-[11px] text-[#5B201A]">
            <strong>Input safety:</strong>{' '}
            {error.originalPreserved
              ? 'Your original document input is still preserved in memory.'
              : 'No partial document state was saved.'}
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] font-medium">
            <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Next step: {error.nextStep}</span>
          </p>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="cs-focus-ring rounded-md p-1 hover:bg-[#732820]/10"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  </div>
);
