import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  SearchCheck,
  Table2,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { ENTITY_CATEGORY_META } from '../utils/categoryMeta';
import type { DetectedEntity, EntityCategory } from '../types/clearshare';
import { HighlightedViewer } from '../components/analysis/HighlightedViewer';

const ALL_CATEGORIES: EntityCategory[] = ['EMAIL', 'PHONE', 'IPV4', 'PAN', 'AADHAAR', 'CARD'];

export const AnalysisStudio: React.FC = () => {
  const {
    hasAnalyzed,
    rawText,
    isCsvMode,
    csvGrid,
    detectedEntities,
    detectionWarnings,
    setActiveScreen,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<EntityCategory | 'ALL'>('ALL');
  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);

  const stats = useMemo(() => {
    const totals: Record<EntityCategory, number> = {
      EMAIL: 0,
      PHONE: 0,
      IPV4: 0,
      PAN: 0,
      AADHAAR: 0,
      CARD: 0,
    };
    const uniqueSets: Record<EntityCategory, Set<string>> = {
      EMAIL: new Set(),
      PHONE: new Set(),
      IPV4: new Set(),
      PAN: new Set(),
      AADHAAR: new Set(),
      CARD: new Set(),
    };
    const occurrenceCounts = new Map<string, number>();

    for (const ent of detectedEntities) {
      totals[ent.category] += 1;
      uniqueSets[ent.category].add(ent.normalizedValue);
      const key = `${ent.category}::${ent.normalizedValue}`;
      occurrenceCounts.set(key, (occurrenceCounts.get(key) ?? 0) + 1);
    }

    return { totals, uniqueSets, occurrenceCounts };
  }, [detectedEntities]);

  const filteredEntities = useMemo(() => {
    if (selectedCategory === 'ALL') return detectedEntities;
    return detectedEntities.filter((e) => e.category === selectedCategory);
  }, [detectedEntities, selectedCategory]);

  if (!rawText.trim() || !hasAnalyzed) {
    return (
      <section className="cs-card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCE9DD] text-[#285C43]">
          <SearchCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#26352D]">Document Analysis Studio</h1>
        <p className="mt-2 text-sm text-[#5B6058]">
          No analyzed document yet. Paste text, upload a TXT/CSV file, or load a synthetic sample
          in the Main Workspace, then click <strong>Start Analysis</strong>.
        </p>
        <button
          type="button"
          onClick={() => setActiveScreen('workspace')}
          className="cs-focus-ring mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#285C43] px-5 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#204B36]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Go to Main Workspace</span>
        </button>
      </section>
    );
  }

  const totalUnique = ALL_CATEGORIES.reduce(
    (sum, cat) => sum + stats.uniqueSets[cat].size,
    0
  );

  const statusBadge = (status: DetectedEntity['status']) => {
    switch (status) {
      case 'valid':
        return 'bg-[#BDE0C4] text-[#204B36]';
      case 'format_only':
        return 'bg-[#F5DFBA] text-[#664212]';
      case 'uncertain':
        return 'bg-[#EAE2F2] text-[#60418A]';
      case 'invalid_checksum':
        return 'bg-[#F4DAD6] text-[#732820]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <section className="cs-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#26352D]">Document Analysis Studio</h1>
            <p className="mt-1 text-sm text-[#5B6058]">
              Detected <strong>{detectedEntities.length}</strong> total direct identifier
              occurrence(s) ({totalUnique} unique normalized values) across 6 mandatory categories.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setActiveScreen('workspace')}
              className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E8E2D8] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#26352D] hover:bg-[#F5F0E6]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Edit Input</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('simulator')}
              className="cs-focus-ring-purple inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#60418A] px-5 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#4E3471]"
            >
              <span>Simulate Privacy Exposure</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Category Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ALL_CATEGORIES.map((cat) => {
            const meta = ENTITY_CATEGORY_META[cat];
            const total = stats.totals[cat];
            const unique = stats.uniqueSets[cat].size;
            const active = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(active ? 'ALL' : cat)}
                className={`cs-focus-ring rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? 'border-[#285C43] bg-[#DCE9DD]/55'
                    : 'border-[#E8E2D8] bg-[#F5F0E6]/45 hover:bg-[#F5F0E6]'
                }`}
              >
                <div className="text-xs font-semibold text-[#5B6058]">{meta.shortLabel}</div>
                <div className="mt-1 text-2xl font-bold text-[#26352D]">{total}</div>
                <div className="text-[11px] text-[#5B6058]">{unique} unique</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Warnings for uncertain / invalid matches */}
      {detectionWarnings.length > 0 && (
        <section className="rounded-xl border border-[#E2C28E] bg-[#F5DFBA]/55 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#664212]">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Validation Notes & Uncertain Matches ({detectionWarnings.length})</span>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-[#664212]">
            {detectionWarnings.map((w) => (
              <li key={w.id}>
                • <strong>{ENTITY_CATEGORY_META[w.category].shortLabel}</strong> (chars {w.start}–
                {w.end}): {w.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Main Split: Highlighted Document + Entity Inspection Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="cs-card p-5 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#26352D]">
              {isCsvMode ? 'CSV Cell Inspection' : 'Highlighted Document'}
            </h2>
            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="text-xs font-semibold text-[#285C43] hover:underline"
              >
                Show all categories
              </button>
            )}
          </div>

          {isCsvMode && csvGrid ? (
            <div className="overflow-x-auto rounded-xl border border-[#E8E2D8]">
              <div className="flex items-center gap-2 border-b border-[#E8E2D8] bg-[#F5F0E6] px-3 py-2 text-xs font-medium text-[#26352D]">
                <Table2 className="h-3.5 w-3.5 text-[#285C43]" aria-hidden="true" />
                <span>
                  {csvGrid.headers.length} columns · {csvGrid.rows.length} data rows
                </span>
              </div>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#F5F0E6]/65">
                    <th className="border-b border-[#E8E2D8] px-2.5 py-2 font-semibold text-[#5B6058]">
                      Row
                    </th>
                    {csvGrid.headers.map((h, i) => (
                      <th
                        key={i}
                        className="border-b border-[#E8E2D8] px-2.5 py-2 font-semibold text-[#26352D]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvGrid.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-[#E8E2D8] last:border-0">
                      <td className="px-2.5 py-2 font-mono text-[#5B6058]">{rIdx + 1}</td>
                      {row.map((cell, cIdx) => {
                        const cellEntities = filteredEntities.filter(
                          (e) => e.rowIndex === rIdx + 1 && e.colIndex === cIdx
                        );
                        return (
                          <td key={cIdx} className="max-w-[220px] px-2.5 py-2 align-top">
                            {cellEntities.length > 0 ? (
                              <HighlightedViewer
                                text={cell}
                                entities={cellEntities}
                                selectedEntityId={selectedEntity?.id}
                                onSelectEntity={setSelectedEntity}
                              />
                            ) : (
                              <span className="whitespace-pre-wrap text-[#26352D]">{cell}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <HighlightedViewer
              text={rawText}
              entities={filteredEntities}
              selectedEntityId={selectedEntity?.id}
              onSelectEntity={setSelectedEntity}
            />
          )}
        </section>

        {/* Findings List */}
        <section className="cs-card p-5 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#26352D]">
              Detected Entities ({filteredEntities.length})
            </h2>
            <span className="text-xs text-[#5B6058]">Click an entity to inspect details</span>
          </div>

          {selectedEntity && (
            <div className="mb-4 rounded-xl border border-[#B6D4BA] bg-[#DCE9DD]/45 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#204B36]">
                  Selected: {ENTITY_CATEGORY_META[selectedEntity.category].label}
                </span>
                <span className="font-mono text-[#5B6058]">
                  Offset {selectedEntity.start}–{selectedEntity.end}
                </span>
              </div>
              <p className="mt-1.5 text-[#26352D]">{selectedEntity.statusNote}</p>
            </div>
          )}

          {filteredEntities.length === 0 ? (
            <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/45 p-6 text-center text-sm text-[#5B6058]">
              <CheckCircle2 className="mx-auto h-6 w-6 text-[#285C43]" aria-hidden="true" />
              <p className="mt-2">No direct entities detected in this category filter.</p>
            </div>
          ) : (
            <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
              {filteredEntities.map((ent) => {
                const meta = ENTITY_CATEGORY_META[ent.category];
                const occCount =
                  stats.occurrenceCounts.get(`${ent.category}::${ent.normalizedValue}`) ?? 1;
                const isSelected = selectedEntity?.id === ent.id;

                return (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => setSelectedEntity(ent)}
                    className={`cs-focus-ring w-full rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-[#285C43] bg-[#DCE9DD]/40'
                        : 'border-[#E8E2D8] bg-[#FFFFFF] hover:bg-[#F5F0E6]/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                        >
                          {meta.shortLabel}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#26352D]">
                          {ent.rawValue}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {occCount > 1 && (
                          <span className="rounded-full bg-[#EAE2F2] px-2 py-0.5 text-[11px] font-medium text-[#60418A]">
                            ×{occCount} duplicate
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(
                            ent.status
                          )}`}
                        >
                          {ent.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5B6058]">
                      <span>
                        {ent.rowIndex
                          ? `Row ${ent.rowIndex}, Col "${ent.columnName}" · `
                          : ''}
                        Chars {ent.start}–{ent.end}
                      </span>
                      <span className="font-mono">Normalized: {ent.normalizedValue}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
