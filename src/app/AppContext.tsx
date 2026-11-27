import React, { createContext, useCallback, useContext, useState } from 'react';
import type {
  ActivityLogEntry,
  ContextClue,
  CsvGrid,
  DetectedEntity,
  DocumentSource,
  ExposureSimulationResult,
  RedactionResult,
  SanitizationMode,
  ScreenId,
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

interface StatusBanner {
  kind: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface AppContextValue {
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  rawText: string;
  setRawText: (text: string) => void;
  documentSource: DocumentSource;
  csvGrid: CsvGrid | null;
  sanitizationMode: SanitizationMode;
  setSanitizationMode: (mode: SanitizationMode) => void;
  customPhrases: string[];
  addCustomPhrase: (phrase: string) => void;
  removeCustomPhrase: (phrase: string) => void;
  additionalRedactions: string[];
  toggleAdditionalRedaction: (value: string) => void;
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
  startAnalysis: () => void;
  rerunSimulation: (overrideMode?: SanitizationMode) => void;
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
  const [activeScreen, setActiveScreen] = useState<ScreenId>('workspace');
  const [rawText, setRawTextState] = useState<string>('');
  const [documentSource, setDocumentSource] = useState<DocumentSource>({ kind: 'paste' });
  const [csvGrid, setCsvGrid] = useState<CsvGrid | null>(null);
  const [sanitizationMode, setSanitizationModeState] = useState<SanitizationMode>('full_mask');
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
    setHasAnalyzed(false);
    setSimulationResult(null);
    setRedactionResult(null);
    setAppliedSpans([]);
    setSimulationHistory([]);
    setAdditionalRedactions([]);
  }, []);

  const setDocumentInputMeta = useCallback((source: DocumentSource, grid: CsvGrid | null) => {
    setDocumentSource(source);
    setCsvGrid(grid);
  }, []);

  const setSanitizationMode = useCallback(
    (mode: SanitizationMode) => {
      setSanitizationModeState(mode);
      logAction('Sanitization mode selected', SANITIZATION_MODE_META[mode].name);
    },
    [logAction]
  );

  const addCustomPhrase = useCallback(
    (phrase: string) => {
      const trimmed = phrase.trim();
      if (!trimmed) return;
      setCustomPhrases((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
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

  const executePipeline = useCallback(
    (
      textToProcess: string,
      modeToUse: SanitizationMode,
      extraRedactions: string[],
      sourceMeta: DocumentSource,
      phrases: string[],
      isRerun: boolean
    ) => {
      const useCsv = isLikelyCsvInput(textToProcess, sourceMeta.kind, sourceMeta.fileName);

      if (useCsv) {
        const csvOut = processCsvDocument(
          textToProcess,
          modeToUse,
          phrases,
          extraRedactions,
          sourceMeta.fileName ?? 'document.csv'
        );

        const simOut = runExposureSimulation({
          sanitizedText: csvOut.sanitizedCsvText,
          mode: modeToUse,
          originalDirectEntitiesCount: csvOut.entities.length,
          originalContextCluesCount: csvOut.contextClues.length,
          customPhrases: phrases,
          appliedAdditionalRedactions: extraRedactions,
        });

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
          const snapshot: SimulationSnapshot = {
            runNumber: isRerun ? prev.length + 1 : 1,
            level: simOut.level,
            scorePoints: simOut.scorePoints,
            remainingDirectCount: simOut.remainingDirectEntities.length,
            remainingClueCount: simOut.remainingContextClues.length,
            linkabilityCount: simOut.linkabilityFindings.length,
            mode: modeToUse,
            additionalRedactionsCount: extraRedactions.length,
          };
          return isRerun ? [...prev, snapshot] : [snapshot];
        });

        return {
          directCount: csvOut.entities.length,
          clueCount: csvOut.contextClues.length,
          simLevel: simOut.level,
          recCount: simOut.recommendations.length,
        };
      }

      // Plain text pipeline
      const detection = detectEntities(textToProcess);
      const clues = detectContextClues(textToProcess, phrases);

      const extraSet = new Set(
        extraRedactions.map((v) => v.trim().toLowerCase()).filter(Boolean)
      );
      const cluesToRedact = clues.filter(
        (c) => extraSet.has(c.normalizedValue) || extraSet.has(c.value.toLowerCase())
      );

      const registry = new InMemoryPseudonymRegistry();
      const redacted = sanitizeText(
        textToProcess,
        detection.entities,
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
        const snapshot: SimulationSnapshot = {
          runNumber: isRerun ? prev.length + 1 : 1,
          level: simOut.level,
          scorePoints: simOut.scorePoints,
          remainingDirectCount: simOut.remainingDirectEntities.length,
          remainingClueCount: simOut.remainingContextClues.length,
          linkabilityCount: simOut.linkabilityFindings.length,
          mode: modeToUse,
          additionalRedactionsCount: extraRedactions.length,
        };
        return isRerun ? [...prev, snapshot] : [snapshot];
      });

      return {
        directCount: detection.entities.length,
        clueCount: clues.length,
        simLevel: simOut.level,
        recCount: simOut.recommendations.length,
      };
    },
    []
  );

  const loadSample = useCallback(
    (sampleId: string) => {
      const sample = SYNTHETIC_SAMPLES.find((s) => s.id === sampleId);
      if (!sample) return;
      setRawTextState(sample.content);
      setDocumentSource({
        kind: sample.format === 'csv' ? 'csv' : 'sample',
        fileName: `${sample.id}.${sample.format}`,
        sampleId: sample.id,
      });
      setCsvGrid(null);
      setHasAnalyzed(false);
      setDetectedEntities([]);
      setDetectionWarnings([]);
      setContextClues([]);
      setAppliedSpans([]);
      setRedactionResult(null);
      setSimulationResult(null);
      setSimulationHistory([]);
      setAdditionalRedactions([]);
      setStatusBanner({
        kind: 'success',
        message: `Loaded synthetic sample: ${sample.title}. Click "Start Analysis" to run detection and simulation.`,
      });
      logAction('Synthetic sample loaded', `${sample.title} (${sample.format.toUpperCase()})`);
    },
    [logAction]
  );

  const startAnalysis = useCallback(() => {
    if (!rawText.trim()) {
      setStatusBanner({
        kind: 'warning',
        message: 'Paste text, upload a TXT/CSV file, or load a synthetic sample before starting analysis.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      logAction('Analysis started', `Processing ${rawText.length} characters locally`);
      const summary = executePipeline(
        rawText,
        sanitizationMode,
        additionalRedactions,
        documentSource,
        customPhrases,
        false
      );
      setHasAnalyzed(true);
      logAction(
        'Entities detected & redacted',
        `${summary.directCount} direct entities, ${summary.clueCount} contextual clues processed (${SANITIZATION_MODE_META[sanitizationMode].shortName})`
      );
      logAction(
        'Exposure simulation completed',
        `Assessed ${summary.simLevel} Exposure; ${summary.recCount} recommendation(s) generated`
      );
      setStatusBanner({
        kind: 'success',
        message: `Analysis complete: ${summary.directCount} direct identifier(s) and ${summary.clueCount} contextual clue(s) evaluated.`,
      });
      setActiveScreen('analysis');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to process document locally.';
      setStatusBanner({ kind: 'error', message: msg });
      logAction('Processing error', 'Local parser encountered invalid structure');
    } finally {
      setIsProcessing(false);
    }
  }, [
    rawText,
    sanitizationMode,
    additionalRedactions,
    documentSource,
    customPhrases,
    executePipeline,
    logAction,
  ]);

  const rerunSimulation = useCallback(
    (overrideMode?: SanitizationMode) => {
      if (!rawText.trim()) return;
      const modeToUse = overrideMode ?? sanitizationMode;
      if (overrideMode && overrideMode !== sanitizationMode) {
        setSanitizationModeState(overrideMode);
        logAction('Sanitization mode changed', SANITIZATION_MODE_META[overrideMode].name);
      }
      setIsProcessing(true);
      try {
        const summary = executePipeline(
          rawText,
          modeToUse,
          additionalRedactions,
          documentSource,
          customPhrases,
          true
        );
        logAction(
          'Exposure re-simulation completed',
          `Result: ${summary.simLevel} Exposure (${additionalRedactions.length} extra clue redaction rule(s) active)`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Re-simulation failed.';
        setStatusBanner({ kind: 'error', message: msg });
      } finally {
        setIsProcessing(false);
      }
    },
    [
      rawText,
      sanitizationMode,
      additionalRedactions,
      documentSource,
      customPhrases,
      executePipeline,
      logAction,
    ]
  );

  const clearAllData = useCallback(() => {
    setRawTextState('');
    setDocumentSource({ kind: 'paste' });
    setCsvGrid(null);
    setIsCsvMode(false);
    setCsvStructureVerified(false);
    setCustomPhrases([]);
    setAdditionalRedactions([]);
    setHasAnalyzed(false);
    setDetectedEntities([]);
    setDetectionWarnings([]);
    setContextClues([]);
    setAppliedSpans([]);
    setRedactionResult(null);
    setSimulationResult(null);
    setSimulationHistory([]);
    setStatusBanner({
      kind: 'success',
      message: 'All document data, findings, and in-memory mappings have been cleared.',
    });
    setActivityLog([
      {
        id: makeId('log'),
        timestamp: createTimestamp(),
        action: 'Workspace cleared',
        detail: 'All in-memory document content and pseudonym maps discarded.',
      },
    ]);
    setActiveScreen('workspace');
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        rawText,
        setRawText,
        documentSource,
        csvGrid,
        sanitizationMode,
        setSanitizationMode,
        customPhrases,
        addCustomPhrase,
        removeCustomPhrase,
        additionalRedactions,
        toggleAdditionalRedaction,
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
        startAnalysis,
        rerunSimulation,
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
