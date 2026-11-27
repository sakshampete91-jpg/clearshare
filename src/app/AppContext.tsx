import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  ActivityLogEntry,
  ContextClue,
  ContextClueCategory,
  CsvGrid,
  DetectedEntity,
  DocumentSource,
  EntityCategory,
  ExposureSimulationResult,
  RedactionResult,
  SanitizationMode,
  SimulationSnapshot,
} from '../types/clearshare';
import { SYNTHETIC_SAMPLES } from '../data/syntheticSamples';
import { SANITIZATION_MODE_META } from '../utils/categoryMeta';
import { detectEntities, type DetectionWarning } from '../engines/detection/detectEntities';
import { detectContextClues } from '../engines/context/detectContextClues';
import {
  InMemoryPseudonymRegistry,
  sanitizeText,
  type RedactionSpan,
} from '../engines/redaction/sanitizeDocument';
import { runExposureSimulation } from '../engines/simulation/runExposureSimulation';
import {
  isLikelyCsvInput,
  processCsvDocument,
} from '../engines/export/csvProcessor';

export const DEFAULT_ENABLED_DIRECT: EntityCategory[] = [
  'EMAIL',
  'PHONE',
  'IPV4',
  'PAN',
  'AADHAAR',
  'CARD',
];

export const DEFAULT_ENABLED_CONTEXT: ContextClueCategory[] = ['CUSTOM_PHRASE'];

interface StatusBanner {
  kind: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface AppContextValue {
  rawText: string;
  setRawText: (text: string) => void;
  documentSource: DocumentSource;
  csvGrid: CsvGrid | null;
  sanitizationMode: SanitizationMode;
  setSanitizationMode: (mode: SanitizationMode) => void;
  enabledDirectCategories: EntityCategory[];
  toggleDirectCategory: (category: EntityCategory) => void;
  enabledContextCategories: ContextClueCategory[];
  toggleContextCategory: (category: ContextClueCategory) => void;
  customPhrases: string[];
  addCustomPhrase: (phrase: string) => void;
  removeCustomPhrase: (phrase: string) => void;
  additionalRedactions: string[];
  toggleAdditionalRedaction: (value: string) => void;
  applySingleRecommendation: (value: string) => void;
  hasAnalyzed: boolean;
  isProcessing: boolean;
  isCsvMode: boolean;
  detectedEntities: DetectedEntity[];
  detectionWarnings: DetectionWarning[];
  contextClues: ContextClue[];
  appliedSpans: RedactionSpan[];
  redactionResult: RedactionResult | null;
  simulationResult: ExposureSimulationResult | null;
  simulationHistory: SimulationSnapshot[];
  csvStructureVerified: boolean;
  activityLog: ActivityLogEntry[];
  statusBanner: StatusBanner | null;
  clearStatusBanner: () => void;
  loadSample: (sampleId: string) => void;
  loadUploadedFile: (file: File) => Promise<void>;
  clearAllData: () => void;
  logAction: (action: string, detail: string) => void;
  setBanner: (banner: StatusBanner | null) => void;
  setDocumentInputMeta: (source: DocumentSource, grid: CsvGrid | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function createTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawText, setRawTextState] = useState<string>('');
  const [documentSource, setDocumentSource] = useState<DocumentSource>({ kind: 'paste' });
  const [csvGrid, setCsvGrid] = useState<CsvGrid | null>(null);
  const [sanitizationMode, setSanitizationModeState] = useState<SanitizationMode>('full_mask');
  const [enabledDirectCategories, setEnabledDirectCategories] = useState<EntityCategory[]>(
    DEFAULT_ENABLED_DIRECT
  );
  const [enabledContextCategories, setEnabledContextCategories] = useState<ContextClueCategory[]>(
    DEFAULT_ENABLED_CONTEXT
  );
  const [customPhrases, setCustomPhrases] = useState<string[]>([]);
  const [additionalRedactions, setAdditionalRedactions] = useState<string[]>([]);

  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCsvMode, setIsCsvMode] = useState<boolean>(false);
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>([]);
  const [detectionWarnings, setDetectionWarnings] = useState<DetectionWarning[]>([]);
  const [contextClues, setContextClues] = useState<ContextClue[]>([]);
  const [appliedSpans, setAppliedSpans] = useState<RedactionSpan[]>([]);
  const [redactionResult, setRedactionResult] = useState<RedactionResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<ExposureSimulationResult | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationSnapshot[]>([]);
  const [csvStructureVerified, setCsvStructureVerified] = useState<boolean>(false);

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([
    {
      id: makeId('log'),
      timestamp: createTimestamp(),
      action: 'Session initialized',
      detail: 'Local browser-only workspace ready. Zero external transmission.',
    },
  ]);
  const [statusBanner, setStatusBanner] = useState<StatusBanner | null>(null);
  const lastLoggedSignatureRef = useRef<string>('');

  const logAction = useCallback((action: string, detail: string) => {
    setActivityLog((prev) => [
      {
        id: makeId('log'),
        timestamp: createTimestamp(),
        action,
        detail,
      },
      ...prev.slice(0, 59),
    ]);
  }, []);

  const setRawText = useCallback((text: string) => {
    setRawTextState(text);
    setSimulationHistory([]);
  }, []);

  const setDocumentInputMeta = useCallback((source: DocumentSource, grid: CsvGrid | null) => {
    setDocumentSource(source);
    setCsvGrid(grid);
  }, []);

  const setSanitizationMode = useCallback(
    (mode: SanitizationMode) => {
      setSanitizationModeState(mode);
      logAction('Sanitization mode changed', SANITIZATION_MODE_META[mode].name);
    },
    [logAction]
  );

  const toggleDirectCategory = useCallback(
    (category: EntityCategory) => {
      setEnabledDirectCategories((prev) => {
        const exists = prev.includes(category);
        const next = exists ? prev.filter((c) => c !== category) : [...prev, category];
        logAction(
          'Protection category updated',
          `${category} ${exists ? 'disabled' : 'enabled'} for sanitization`
        );
        return next;
      });
    },
    [logAction]
  );

  const toggleContextCategory = useCallback(
    (category: ContextClueCategory) => {
      setEnabledContextCategories((prev) => {
        const exists = prev.includes(category);
        const next = exists ? prev.filter((c) => c !== category) : [...prev, category];
        logAction(
          'Contextual protection updated',
          `${category} ${exists ? 'disabled' : 'enabled'} for sanitization`
        );
        return next;
      });
    },
    [logAction]
  );

  const addCustomPhrase = useCallback(
    (phrase: string) => {
      const trimmed = phrase.trim();
      if (!trimmed) return;
      setCustomPhrases((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setEnabledContextCategories((prev) =>
        prev.includes('CUSTOM_PHRASE') ? prev : [...prev, 'CUSTOM_PHRASE']
      );
      logAction('Custom sensitive phrase added', '1 custom phrase rule stored in memory');
    },
    [logAction]
  );

  const removeCustomPhrase = useCallback((phrase: string) => {
    setCustomPhrases((prev) => prev.filter((item) => item !== phrase));
  }, []);

  const toggleAdditionalRedaction = useCallback((value: string) => {
    setAdditionalRedactions((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }, []);

  const applySingleRecommendation = useCallback(
    (value: string) => {
      setAdditionalRedactions((prev) => {
        if (prev.some((v) => v.toLowerCase() === value.toLowerCase())) return prev;
        return [...prev, value];
      });
      logAction('Recommendation applied', 'Additional contextual clue added to redaction list');
    },
    [logAction]
  );

  const runLivePipeline = useCallback(
    (
      textToProcess: string,
      modeToUse: SanitizationMode,
      directCats: EntityCategory[],
      contextCats: ContextClueCategory[],
      extraRedactions: string[],
      sourceMeta: DocumentSource,
      phrases: string[]
    ) => {
      if (!textToProcess.trim()) {
        setHasAnalyzed(false);
        setIsCsvMode(false);
        setCsvGrid(null);
        setCsvStructureVerified(false);
        setDetectedEntities([]);
        setDetectionWarnings([]);
        setContextClues([]);
        setAppliedSpans([]);
        setRedactionResult(null);
        setSimulationResult(null);
        setSimulationHistory([]);
        return;
      }

      const useCsv = isLikelyCsvInput(textToProcess, sourceMeta.kind, sourceMeta.fileName);

      if (useCsv) {
        const csvOut = processCsvDocument(
          textToProcess,
          modeToUse,
          phrases,
          extraRedactions,
          sourceMeta.fileName ?? 'document.csv',
          directCats,
          contextCats
        );

        const simOut = runExposureSimulation({
          sanitizedText: csvOut.sanitizedCsvText,
          mode: modeToUse,
          originalDirectEntitiesCount: csvOut.entities.length,
          originalContextCluesCount: csvOut.contextClues.length,
          customPhrases: phrases,
          appliedAdditionalRedactions: extraRedactions,
        });

        setHasAnalyzed(true);
        setIsCsvMode(true);
        setCsvGrid(csvOut.originalGrid);
        setCsvStructureVerified(csvOut.structureVerified);
        setDetectedEntities(csvOut.entities);
        setDetectionWarnings([]);
        setContextClues(csvOut.contextClues);
        setAppliedSpans([]);
        setRedactionResult({
          sanitizedText: csvOut.sanitizedCsvText,
          sanitizedCsv: csvOut.sanitizedGrid,
          redactedDirectCount: csvOut.redactedDirectCount,
          redactedContextCount: csvOut.redactedContextCount,
          pseudonymCount: csvOut.pseudonymCount,
        });
        setSimulationResult(simOut);
        setSimulationHistory((prev) => {
          const last = prev[prev.length - 1];
          if (
            last &&
            last.scorePoints === simOut.scorePoints &&
            last.mode === modeToUse &&
            last.additionalRedactionsCount === extraRedactions.length
          ) {
            return prev;
          }
          return [
            ...prev.slice(-9),
            {
              runNumber: prev.length + 1,
              level: simOut.level,
              scorePoints: simOut.scorePoints,
              remainingDirectCount: simOut.remainingDirectEntities.length,
              remainingClueCount: simOut.remainingContextClues.length,
              linkabilityCount: simOut.linkabilityFindings.length,
              mode: modeToUse,
              additionalRedactionsCount: extraRedactions.length,
            },
          ];
        });
        return;
      }

      // Plain text pipeline
      const detection = detectEntities(textToProcess);
      const clues = detectContextClues(textToProcess, phrases);

      const directSet = new Set(directCats);
      const contextSet = new Set(contextCats);
      const extraSet = new Set(
        extraRedactions.map((v) => v.trim().toLowerCase()).filter(Boolean)
      );

      const entitiesToRedact = detection.entities.filter((e) => directSet.has(e.category));
      const cluesToRedact = clues.filter(
        (c) =>
          contextSet.has(c.category) ||
          extraSet.has(c.normalizedValue) ||
          extraSet.has(c.value.toLowerCase())
      );

      const registry = new InMemoryPseudonymRegistry();
      const redacted = sanitizeText(
        textToProcess,
        entitiesToRedact,
        modeToUse,
        cluesToRedact,
        registry
      );

      const simOut = runExposureSimulation({
        sanitizedText: redacted.sanitizedText,
        mode: modeToUse,
        originalDirectEntitiesCount: detection.entities.length,
        originalContextCluesCount: clues.length,
        customPhrases: phrases,
        appliedAdditionalRedactions: extraRedactions,
      });

      setHasAnalyzed(true);
      setIsCsvMode(false);
      setCsvGrid(null);
      setCsvStructureVerified(false);
      setDetectedEntities(detection.entities);
      setDetectionWarnings(detection.warnings);
      setContextClues(clues);
      setAppliedSpans(redacted.appliedSpans);
      setRedactionResult({
        sanitizedText: redacted.sanitizedText,
        sanitizedCsv: null,
        redactedDirectCount: redacted.redactedDirectCount,
        redactedContextCount: redacted.redactedContextCount,
        pseudonymCount: registry.size,
      });
      setSimulationResult(simOut);
      setSimulationHistory((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.scorePoints === simOut.scorePoints &&
          last.mode === modeToUse &&
          last.additionalRedactionsCount === extraRedactions.length
        ) {
          return prev;
        }
        return [
          ...prev.slice(-9),
          {
            runNumber: prev.length + 1,
            level: simOut.level,
            scorePoints: simOut.scorePoints,
            remainingDirectCount: simOut.remainingDirectEntities.length,
            remainingClueCount: simOut.remainingContextClues.length,
            linkabilityCount: simOut.linkabilityFindings.length,
            mode: modeToUse,
            additionalRedactionsCount: extraRedactions.length,
          },
        ];
      });

      const sig = `${textToProcess.length}|${detection.entities.length}|${simOut.level}|${modeToUse}`;
      if (lastLoggedSignatureRef.current !== sig) {
        lastLoggedSignatureRef.current = sig;
        logAction(
          'Live analysis & simulation updated',
          `${detection.entities.length} direct entities, ${clues.length} contextual clues · ${simOut.level} Exposure`
        );
      }
    },
    [logAction]
  );

  // Instant debounced live analysis whenever input or settings change
  useEffect(() => {
    if (!rawText.trim()) {
      runLivePipeline(
        rawText,
        sanitizationMode,
        enabledDirectCategories,
        enabledContextCategories,
        additionalRedactions,
        documentSource,
        customPhrases
      );
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    const timer = window.setTimeout(() => {
      try {
        runLivePipeline(
          rawText,
          sanitizationMode,
          enabledDirectCategories,
          enabledContextCategories,
          additionalRedactions,
          documentSource,
          customPhrases
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to process document locally.';
        setStatusBanner({ kind: 'error', message: msg });
        logAction('Processing error', 'Local parser encountered invalid structure');
      } finally {
        setIsProcessing(false);
      }
    }, 90);

    return () => window.clearTimeout(timer);
  }, [
    rawText,
    sanitizationMode,
    enabledDirectCategories,
    enabledContextCategories,
    additionalRedactions,
    documentSource,
    customPhrases,
    runLivePipeline,
    logAction,
  ]);

  const loadSample = useCallback(
    (sampleId: string) => {
      const sample = SYNTHETIC_SAMPLES.find((s) => s.id === sampleId);
      if (!sample) return;
      setAdditionalRedactions([]);
      setSimulationHistory([]);
      setEnabledDirectCategories(DEFAULT_ENABLED_DIRECT);
      setEnabledContextCategories(DEFAULT_ENABLED_CONTEXT);
      setDocumentSource({
        kind: sample.format === 'csv' ? 'csv' : 'sample',
        fileName: `${sample.id}.${sample.format}`,
        sampleId: sample.id,
      });
      setRawTextState(sample.content);
      setStatusBanner(null);
      logAction('Synthetic sample loaded', `${sample.title} (${sample.format.toUpperCase()})`);
    },
    [logAction]
  );

  const loadUploadedFile = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      const isTxt = lower.endsWith('.txt') || file.type === 'text/plain';
      const isCsv = lower.endsWith('.csv') || file.type === 'text/csv';

      if (!isTxt && !isCsv) {
        setStatusBanner({
          kind: 'error',
          message: 'Unsupported file format. Upload a .txt or .csv document.',
        });
        return;
      }

      const maxBytes = 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        setStatusBanner({
          kind: 'error',
          message: 'File exceeds the 2 MB browser safety limit. Please split smaller batches.',
        });
        return;
      }

      try {
        const content = await file.text();
        if (!content.trim()) {
          setStatusBanner({
            kind: 'warning',
            message: 'The selected file is empty. Choose a file with text content.',
          });
          return;
        }
        setAdditionalRedactions([]);
        setSimulationHistory([]);
        setDocumentSource({ kind: isCsv ? 'csv' : 'txt', fileName: file.name });
        setRawTextState(content);
        setStatusBanner({
          kind: 'success',
          message: `Loaded ${file.name} locally in browser memory.`,
        });
        logAction(`${isCsv ? 'CSV' : 'TXT'} document loaded`, `Size: ${file.size} bytes`);
      } catch {
        setStatusBanner({
          kind: 'error',
          message: 'Could not read the selected file locally in the browser.',
        });
      }
    },
    [logAction]
  );

  const clearAllData = useCallback(() => {
    setRawTextState('');
    setDocumentSource({ kind: 'paste' });
    setCsvGrid(null);
    setIsCsvMode(false);
    setCsvStructureVerified(false);
    setCustomPhrases([]);
    setAdditionalRedactions([]);
    setEnabledDirectCategories(DEFAULT_ENABLED_DIRECT);
    setEnabledContextCategories(DEFAULT_ENABLED_CONTEXT);
    setHasAnalyzed(false);
    setDetectedEntities([]);
    setDetectionWarnings([]);
    setContextClues([]);
    setAppliedSpans([]);
    setRedactionResult(null);
    setSimulationResult(null);
    setSimulationHistory([]);
    lastLoggedSignatureRef.current = '';
    setStatusBanner({
      kind: 'success',
      message: 'Workspace cleared. All document content and in-memory mappings discarded.',
    });
    setActivityLog([
      {
        id: makeId('log'),
        timestamp: createTimestamp(),
        action: 'Workspace cleared',
        detail: 'All in-memory document content and pseudonym maps discarded.',
      },
    ]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        rawText,
        setRawText,
        documentSource,
        csvGrid,
        sanitizationMode,
        setSanitizationMode,
        enabledDirectCategories,
        toggleDirectCategory,
        enabledContextCategories,
        toggleContextCategory,
        customPhrases,
        addCustomPhrase,
        removeCustomPhrase,
        additionalRedactions,
        toggleAdditionalRedaction,
        applySingleRecommendation,
        hasAnalyzed,
        isProcessing,
        isCsvMode,
        detectedEntities,
        detectionWarnings,
        contextClues,
        appliedSpans,
        redactionResult,
        simulationResult,
        simulationHistory,
        csvStructureVerified,
        activityLog,
        statusBanner,
        clearStatusBanner: () => setStatusBanner(null),
        loadSample,
        loadUploadedFile,
        clearAllData,
        logAction,
        setBanner: setStatusBanner,
        setDocumentInputMeta,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
