import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Plus,
  SearchCheck,
  ShieldAlert,
  Table2,
  X,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import {
  ENTITY_CATEGORY_META,
  formatSafeEntityPreview,
} from '../utils/categoryMeta';
import type { DetectedEntity, EntityCategory } from '../types/clearshare';
import { HighlightedViewer } from '../components/analysis/HighlightedViewer';
import { EmptyState } from '../components/ui/EmptyState';
import { containsHtmlLikeMarkup } from '../security/inputGuards';

const ALL_CATEGORIES: EntityCategory[] = [
  'EMAIL',
  'PHONE',
  'IPV4',
  'PAN',
  'AADHAAR',
  'CARD',
  'API_KEY',
];

export const DocumentAnalysisPage: React.FC = () => {
  const {
    rawText,
    hasAnalyzed,
    isCsvMode,
    csvGrid,
    detectedEntities,
    detectionWarnings,
    contextClues,
    customRules,
    addCustomRule,
    removeCustomRule,
    setActiveScreen,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<EntityCategory | 'ALL'>('ALL');
  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
  const [patternInput, setPatternInput] = useState('');
  const [patternKind, setPatternKind] = useState<'literal' | 'regex'>('literal');
  const [patternError, setPatternError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totals: Record<EntityCategory, number> = {
      EMAIL: 0,
      PHONE: 0,
      IPV4: 0,
      PAN: 0,
      AADHAAR: 0,
      CARD: 0,
      API_KEY: 0,
    };
    const uniqueSets: Record<EntityCategory, Set<string>> = {
      EMAIL: new Set(),
      PHONE: new Set(),
      IPV4: new Set(),
      PAN: new Set(),
      AADHAAR: new Set(),
      CARD: new Set(),
      API_KEY: new Set(),
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
      <EmptyState
        icon={SearchCheck}
        title="No Document Analysed Yet"
        description="Enter text, upload a TXT/CSV/PDF/DOCX/JSON document, or select a synthetic sample in Workspace to inspect detected direct and contextual identifiers."
        action={
          <button
            type="button"
            onClick={() => setActiveScreen('workspace')}
            className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface hover:bg-forest-hover"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Open Workspace</span>
          </button>
        }
      />
    );
  }

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCustomRule(patternInput, patternKind);
    if (!res.ok) {
      setPatternError(res.error ?? 'Invalid custom pattern.');
      return;
    }
    setPatternError(null);
    setPatternInput('');
  };

  const hasMarkupWarning = containsHtmlLikeMarkup(rawText);

  return (
    <div className="space-y-4">
      <section className="cs-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-ink">Document Analysis</h1>
            <p className="mt-0.5 text-xs text-muted">
              {detectedEntities.length} direct identifier(s) and {contextClues.length} contextual
              clue(s) identified. Format/checksum matches do not verify official government or
              issuer validity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('simulator')}
            className="cs-focus-ring-purple inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-surface hover:bg-royal-hover"
          >
            <span>Explore in Privacy Simulator</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {ALL_CATEGORIES.map((cat) => {
            const meta = ENTITY_CATEGORY_META[cat];
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(active ? 'ALL' : cat)}
                className={`cs-focus-ring rounded-xl border p-2.5 text-left transition-colors ${
                  active
                    ? 'border-forest bg-sage/60'
                    : 'border-warm-border bg-cream/45 hover:bg-cream'
                }`}
              >
                <div className="text-[11px] font-semibold text-muted">{meta.shortLabel}</div>
                <div className="mt-0.5 text-xl font-bold text-ink">{stats.totals[cat]}</div>
                <div className="text-[10px] text-muted">{stats.uniqueSets[cat].size} unique</div>
              </button>
            );
          })}
        </div>
      </section>

      {hasMarkupWarning && (
        <div className="flex items-center gap-2 rounded-xl border border-[#E2C28E] bg-status-warning/60 px-4 py-2.5 text-xs text-[#664212]">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            HTML or script-like tags were detected in the input. CLEARSHARE renders all document
            text as escaped plain text nodes — uploaded content is never executed.
          </span>
        </div>
      )}

      {detectionWarnings.length > 0 && (
        <section className="rounded-xl border border-[#E2C28E] bg-status-warning/50 p-4 text-xs text-[#664212]">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Validation & False-Positive Notes ({detectionWarnings.length})</span>
          </div>
          <ul className="mt-1.5 space-y-1 text-[11px]">
            {detectionWarnings.map((w) => (
              <li key={w.id}>
                • <strong>{ENTITY_CATEGORY_META[w.category].shortLabel}</strong> (chars {w.start}–
                {w.end}): {w.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Custom Pattern Manager */}
      <section className="cs-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink">
              Custom Detection Patterns (Literal & Validated Regex)
            </h2>
            <p className="text-[11px] text-muted">
              Add internal project codes, employee ID prefixes, or custom regexes (ReDoS-protected).
            </p>
          </div>
        </div>

        <form onSubmit={handleAddRule} className="mt-2.5 flex flex-wrap items-center gap-2">
          <select
            aria-label="Pattern type"
            value={patternKind}
            onChange={(e) => setPatternKind(e.target.value as 'literal' | 'regex')}
            className="cs-focus-ring min-h-[34px] rounded-lg border border-warm-border bg-surface px-2.5 text-xs text-ink"
          >
            <option value="literal">Exact Phrase</option>
            <option value="regex">Regex Pattern</option>
          </select>
          <input
            type="text"
            value={patternInput}
            onChange={(e) => setPatternInput(e.target.value)}
            placeholder={
              patternKind === 'regex' ? 'e.g. EMP-[0-9]{4,6}' : 'e.g. Project Falcon'
            }
            aria-label="Custom detection pattern"
            className="cs-focus-ring min-h-[34px] min-w-[220px] flex-1 rounded-lg border border-warm-border bg-surface px-3 text-xs text-ink"
          />
          <button
            type="submit"
            className="cs-focus-ring inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-forest px-3 text-xs font-semibold text-surface hover:bg-forest-hover"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Rule</span>
          </button>
        </form>
        {patternError && <p className="mt-1.5 text-xs text-[#732820]">{patternError}</p>}

        {customRules.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {customRules.map((rule) => (
              <span
                key={rule.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C6B2DE] bg-lavender px-2.5 py-0.5 text-[11px] font-medium text-royal-hover"
              >
                <span className="uppercase opacity-75">{rule.kind}:</span>
                <span className="font-mono">{rule.pattern}</span>
                <button
                  type="button"
                  onClick={() => removeCustomRule(rule.id)}
                  aria-label={`Remove pattern ${rule.pattern}`}
                  className="rounded-full p-0.5 hover:bg-royal/10"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Split Highlighted Document & Findings Table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="cs-card p-4 lg:col-span-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {isCsvMode ? 'CSV Cell Analysis' : 'Highlighted Source'}
            </h2>
            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="text-xs font-semibold text-forest hover:underline"
              >
                Show all
              </button>
            )}
          </div>

          {isCsvMode && csvGrid ? (
            <div className="max-h-[420px] overflow-auto rounded-xl border border-warm-border">
              <div className="flex items-center gap-2 border-b border-warm-border bg-cream px-3 py-2 text-xs font-medium text-ink">
                <Table2 className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                <span>
                  {csvGrid.headers.length} columns · {csvGrid.rows.length} rows
                </span>
              </div>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-cream/65">
                    <th className="border-b border-warm-border px-2.5 py-1.5 text-muted">Row</th>
                    {csvGrid.headers.map((h, i) => (
                      <th key={i} className="border-b border-warm-border px-2.5 py-1.5 text-ink">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvGrid.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-warm-border last:border-0">
                      <td className="px-2.5 py-1.5 font-mono text-muted">{rIdx + 1}</td>
                      {row.map((cell, cIdx) => {
                        const cellEnts = filteredEntities.filter(
                          (e) => e.rowIndex === rIdx + 1 && e.colIndex === cIdx
                        );
                        return (
                          <td key={cIdx} className="max-w-[200px] px-2.5 py-1.5 align-top">
                            {cellEnts.length > 0 ? (
                              <HighlightedViewer
                                text={cell}
                                entities={cellEnts}
                                selectedEntityId={selectedEntity?.id}
                                onSelectEntity={setSelectedEntity}
                              />
                            ) : (
                              <span className="whitespace-pre-wrap text-ink">{cell}</span>
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
            <div className="max-h-[420px] overflow-y-auto">
              <HighlightedViewer
                text={rawText}
                entities={filteredEntities}
                selectedEntityId={selectedEntity?.id}
                onSelectEntity={setSelectedEntity}
              />
            </div>
          )}
        </section>

        <section className="cs-card p-4 lg:col-span-6">
          <h2 className="mb-2.5 text-sm font-semibold text-ink">
            Detected Entities & Context Confidence ({filteredEntities.length})
          </h2>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {filteredEntities.length === 0 ? (
              <p className="text-xs text-muted">No detected entities in this filter.</p>
            ) : (
              filteredEntities.map((ent) => {
                const meta = ENTITY_CATEGORY_META[ent.category];
                const occ =
                  stats.occurrenceCounts.get(`${ent.category}::${ent.normalizedValue}`) ?? 1;
                return (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => setSelectedEntity(ent)}
                    className={`cs-focus-ring w-full rounded-xl border p-3 text-left text-xs ${
                      selectedEntity?.id === ent.id
                        ? 'border-forest bg-sage/45'
                        : 'border-warm-border bg-surface hover:bg-cream/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                        >
                          {meta.shortLabel}
                        </span>
                        <span className="font-mono font-semibold text-ink">
                          {formatSafeEntityPreview(ent.category, ent.rawValue)}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted">
                        {ent.status.replace('_', ' ')}
                        {occ > 1 ? ` · ×${occ}` : ''} · chars {ent.start}–{ent.end}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">{ent.statusNote}</p>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
