import React, { useRef, useState } from 'react';
import { FileCheck2, Replace, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../app/AppContext';

export const UploadDropZone: React.FC = () => {
  const { documentSource, fileSizeBytes, loadUploadedFile, clearAllData } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await loadUploadedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await loadUploadedFile(file);
  };

  const hasUploadedFile = Boolean(documentSource.fileName && documentSource.kind !== 'paste');

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.csv,.pdf,.docx,.json,text/plain,text/csv,application/pdf,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileInput}
      />

      {hasUploadedFile ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#B6D4BA] bg-sage/45 px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2 text-forest-hover">
            <FileCheck2 className="h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
            <span className="truncate font-semibold">{documentSource.fileName}</span>
            {fileSizeBytes !== null && (
              <span className="shrink-0 text-[11px] opacity-85">
                ({(fileSizeBytes / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cs-focus-ring inline-flex items-center gap-1 rounded-lg border border-warm-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-cream"
            >
              <Replace className="h-3 w-3" aria-hidden="true" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              onClick={clearAllData}
              className="cs-focus-ring inline-flex items-center gap-1 rounded-lg border border-[#DFB3AC] bg-surface px-2.5 py-1 text-[11px] font-semibold text-[#732820] hover:bg-status-error/50"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`cs-focus-ring flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-xs transition-colors ${
            isDragging
              ? 'border-forest bg-sage/60 text-forest-hover'
              : 'border-[#D8D1C4] bg-cream/45 text-muted hover:border-forest/70 hover:bg-sage/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Upload className="h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
            <div>
              <span className="font-medium text-ink">
                Drop a document here or browse — <strong>TXT, CSV, PDF, DOCX, JSON</strong>
              </span>
              <div className="text-[11px] text-subtle">
                Max 2 MB (TXT/CSV/JSON) · Max 5 MB / 50 pages (PDF/DOCX) · Processed locally
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-lg border border-warm-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-forest">
            Browse
          </span>
        </div>
      )}
    </div>
  );
};
