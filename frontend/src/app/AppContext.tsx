import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  ActivityLogEntry,
  AppErrorInfo,
  ContextClue,
  ContextClueCategory,
  CsvGrid,
  CustomPatternRule,
  DetectedEntity,
  DocumentSource,
  EntityCategory,
  ExposureSimulationResult,
  LocalSessionSummary,
  RedactionResult,
  SanitizationMode,
  SanitizationOptions,
  ScreenId,
  SimulationSnapshot,
  VerificationReport,
  VerificationStatus,
} from '../types/clearshare';
import { SYNTHETIC_SAMPLES } from '../data/syntheticSamples';
import { SANITIZATION_MODE_META } from '../utils/categoryMeta';
import type { DetectionWarning } from '../engines/detection/detectEntities';
import type { RedactionSpan } from '../engines/redaction/sanitizeDocument';
import { extractDocumentFromFile } from '../engines/export/documentExtractor';
import {
  buildSafeAppError,
  generateSecureId,
  sanitizeDisplayFilename,
  validateCustomRegexPattern,
} from '../security/inputGuards';
import { DEFAULT_SANITIZATION_OPTIONS } from '../services/sanitization/configuredSanitizer';
import {
  runPrivacyPipeline,
  type PipelineInput,
  type PipelineOutput,
} from '../services/pipeline/pipelineOrchestrator';

export const DEFAULT_ENABLED_DIRECT: EntityCategory[] = [
  'EMAIL',
  'PHONE',
  'IPV4',
  'PAN',
  'AADHAAR',
  'CARD',
  'API_KEY',
];

export const DEFAULT_ENABLED_CONTEXT: ContextClueCategory[] = [
  'PERSON_NAME',
  'LOCATION',
  'CUSTOM_PHRASE',
];

export type AnalysisProgressStep =
  | 'idle'
  | 'Validating input'
  | 'Parsing document'
  | 'Scanning supported patterns'
  | 'Analysing exposure'
  | 'Preparing findings'
  | 'Complete';

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
  fileSizeBytes: number | null;
  csvGrid: CsvGrid | null;
  sanitizationMode: SanitizationMode;
  setSanitizationMode: (mode: SanitizationMode) => void;
  sanitizationOptions: SanitizationOptions;
  updateSanitizationOptions: (patch: Partial<SanitizationOptions>) => void;
  enabledDirectCategories: EntityCategory[];
  toggleDirectCategory: (category: EntityCategory) => void;
  enabledContextCategories: ContextClueCategory[];
  toggleContextCategory: (category: ContextClueCategory) => void;
  customRules: CustomPatternRule[];
  addCustomRule: (
    pattern: string,
    kind: 'literal' | 'regex',
    label?: string
  ) => { ok: boolean; error?: string };
  removeCustomRule: (id: string) => void;
  additionalRedactions: string[];
  toggleAdditionalRedaction: (value: string) => void;
  applySingleRecommendation: (value: string) => void;
  hasAnalyzed: boolean;
  isProcessing: boolean;
  analysisStep: AnalysisProgressStep;
  isCsvMode: boolean;
  detectedEntities: DetectedEntity[];
  detectionWarnings: DetectionWarning[];
  contextClues: ContextClue[];
  appliedSpans: RedactionSpan[];
  redactionResult: RedactionResult | null;
  simulationResult: ExposureSimulationResult | null;
  simulationHistory: SimulationSnapshot[];
  verificationStatus: VerificationStatus;
  verificationReport: VerificationReport | null;
  csvStructureVerified: boolean;
  activityLog: ActivityLogEntry[];
  localSessions: LocalSessionSummary[];
  statusBanner: StatusBanner | null;
  appError: AppErrorInfo | null;
  clearStatusBanner: () => void;
  clearAppError: () => void;
  loadSample: (sampleId: string) => void;
  loadUploadedFile: (file: File) => Promise<void>;
  rerunAnalysisNow: () => void;
  clearAllData: () => void;
  logAction: (action: string, detail: string) => void;
  setBanner: (banner: StatusBanner | null) => void;
  setDocumentInputMeta: (source: DocumentSource, grid: CsvGrid | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function createTimestamp(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const WORKER_THRESHOLD_CHARS = 8000;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('workspace');
  const [rawText, setRawTextState] = useState<string>('');
  const [documentSource, setDocumentSource] = useState<DocumentSource>({ kind: 'paste' });
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [csvGrid, setCsvGrid] = useState<CsvGrid | null>(null);
  const [sanitizationOptions, setSanitizationOptions] = useState<SanitizationOptions>(
    DEFAULT_SANITIZATION_OPTIONS
  );
  const [enabledDirectCategories, setEnabledDirectCategories] = useState<EntityCategory[]>(
    DEFAULT_ENABLED_DIRECT
  );
  const [enabledContextCategories, setEnabledContextCategories] = useState<ContextClueCategory[]>(
    DEFAULT_ENABLED_CONTEXT
  );
  const [customRules, setCustomRules] = useState<CustomPatternRule[]>([]);
  const [additionalRedactions, setAdditionalRedactions] = useState<string[]>([]);

  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisProgressStep>('idle');
  const [isCsvMode, setIsCsvMode] = useState<boolean>(false);
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>([]);
  const [detectionWarnings, setDetectionWarnings] = useState<DetectionWarning[]>([]);
  const [contextClues, setContextClues] = useState<ContextClue[]>([]);
  const [appliedSpans, setAppliedSpans] = useState<RedactionSpan[]>([]);
  const [redactionResult, setRedactionResult] = useState<RedactionResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<ExposureSimulationResult | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationSnapshot[]>([]);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>('Not yet analysed');
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [csvStructureVerified, setCsvStructureVerified] = useState<boolean>(false);
  const [rerunCounter, setRerunCounter] = useState<number>(0);

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([
    {
      id: generateSecureId('log'),
      timestamp: createTimestamp(),
      action: 'Session initialized',
      detail: 'Local browser-only workspace ready. Zero external transmission.',
    },
  ]);
  const [localSessions, setLocalSessions] = useState<LocalSessionSummary[]>([]);
  const [statusBanner, setStatusBanner] = useState<StatusBanner | null>(null);
  const [appError, setAppError] = useState<AppErrorInfo | null>(null);

  const lastLoggedSignatureRef = useRef<string>('');
  const workerRef = useRef<Worker | null>(null);

  const logAction = useCallback((action: string, detail: string) => {
    setActivityLog((prev) => [
      { id: generateSecureId('log'), timestamp: createTimestamp(), action, detail },
      ...prev.slice(0, 59),
    ]);
  }, []);

  const setRawText = useCallback((text: string) => {
    setRawTextState(text);
    setAppError(null);
    setSimulationHistory([]);
    if (!text.trim()) {
      setFileSizeBytes(null);
    }
  }, []);

  const setDocumentInputMeta = useCallback((source: DocumentSource, grid: CsvGrid | null) => {
    setDocumentSource(source);
    setCsvGrid(grid);
  }, []);

  const updateSanitizationOptions = useCallback(
    (patch: Partial<SanitizationOptions>) => {
      setSanitizationOptions((prev) => {
        const next = { ...prev, ...patch };
        if (patch.mode && patch.mode !== prev.mode) {
          logAction('Sanitization strategy changed', SANITIZATION_MODE_META[patch.mode].name);
        }
        return next;
      });
    },
    [logAction]
  );

  const setSanitizationMode = useCallback(
    (mode: SanitizationMode) => {
      updateSanitizationOptions({ mode });
    },
    [updateSanitizationOptions]
  );

  const toggleDirectCategory = useCallback(
    (category: EntityCategory) => {
      setEnabledDirectCategories((prev) => {
        const exists = prev.includes(category);
        const next = exists ? prev.filter((c) => c !== category) : [...prev, category];
        logAction(
          'Detection category toggled',
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
          'Contextual category toggled',
          `${category} ${exists ? 'disabled' : 'enabled'} for sanitization`
        );
        return next;
      });
    },
    [logAction]
  );

  const addCustomRule = useCallback(
    (pattern: string, kind: 'literal' | 'regex', label?: string) => {
      const trimmed = pattern.trim();
      if (!trimmed) {
        return { ok: false, error: 'Pattern cannot be empty.' };
      }
      if (kind === 'regex') {
        const check = validateCustomRegexPattern(trimmed);
        if (!check.valid) {
          return { ok: false, error: check.reason };
        }
      }
      setCustomRules((prev) => {
        if (prev.some((r) => r.pattern === trimmed && r.kind === kind)) return prev;
        return [
          ...prev,
          {
            id: generateSecureId('rule'),
            label: label?.trim() || (kind === 'regex' ? 'Custom Regex' : trimmed),
            pattern: trimmed,
            kind,
          },
        ];
      });
      setEnabledContextCategories((prev) =>
        prev.includes('CUSTOM_PHRASE') ? prev : [...prev, 'CUSTOM_PHRASE']
      );
      logAction('Custom detection rule added', `1 ${kind} rule stored in memory`);
      return { ok: true };
    },
    [logAction]
  );

  const removeCustomRule = useCallback((id: string) => {
    setCustomRules((prev) => prev.filter((r) => r.id !== id));
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
      logAction('Recommendation applied', 'Additional contextual clue queued for redaction');
    },
    [logAction]
  );

  const applyPipelineSuccess = useCallback(
    (out: PipelineOutput, inputText: string, sourceMeta: DocumentSource) => {
      setAnalysisStep('Preparing findings');
      setHasAnalyzed(true);
      setIsCsvMode(out.isCsvMode);
      setCsvGrid(out.csvGrid);
      setCsvStructureVerified(out.csvStructureVerified);
      setDetectedEntities(out.detectedEntities);
      setDetectionWarnings(out.detectionWarnings);
      setContextClues(out.contextClues);
      setAppliedSpans(out.appliedSpans);
      setRedactionResult(out.redactionResult);
      setSimulationResult(out.simulationResult);
      setVerificationReport(out.verificationReport);
      setVerificationStatus(out.verificationReport.status);
      setAppError(null);
      setAnalysisStep('Complete');
      setIsProcessing(false);

      setSimulationHistory((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.scorePoints === out.simulationResult.scorePoints &&
          last.mode === sanitizationOptions.mode &&
          last.additionalRedactionsCount === additionalRedactions.length
        ) {
          return prev;
        }
        return [
          ...prev.slice(-9),
          {
            runNumber: prev.length + 1,
            level: out.simulationResult.level,
            scorePoints: out.simulationResult.scorePoints,
            remainingDirectCount: out.simulationResult.remainingDirectEntities.length,
            remainingClueCount: out.simulationResult.remainingContextClues.length,
            linkabilityCount: out.simulationResult.linkabilityFindings.length,
            mode: sanitizationOptions.mode,
            additionalRedactionsCount: additionalRedactions.length,
          },
        ];
      });

      const sig = `${inputText.length}|${out.detectedEntities.length}|${out.verificationReport.status}|${sanitizationOptions.mode}`;
      if (lastLoggedSignatureRef.current !== sig) {
        lastLoggedSignatureRef.current = sig;
        logAction(
          'Pipeline & independent verification completed',
          `${out.detectedEntities.length} direct, ${out.contextClues.length} clues · ${out.verificationReport.status}`
        );
        const sourceLabel = sanitizeDisplayFilename(
          sourceMeta.fileName ?? (sourceMeta.kind === 'paste' ? 'Pasted text' : sourceMeta.kind)
        );
        setLocalSessions((prev) => [
          {
            id: generateSecureId('sess'),
            timestamp: createTimestamp(),
            sourceLabel,
            mode: sanitizationOptions.mode,
            detectedCount: out.detectedEntities.length + out.contextClues.length,
            redactedCount:
              out.redactionResult.redactedDirectCount + out.redactionResult.redactedContextCount,
            verificationStatus: out.verificationReport.status,
          },
          ...prev.slice(0, 4),
        ]);
      }
    },
    [sanitizationOptions.mode, additionalRedactions.length, logAction]
  );

  const applyPipelineFailure = useCallback(
    (err: unknown) => {
      setAnalysisStep('idle');
      setIsProcessing(false);
      setVerificationStatus('Verification failed');
      setVerificationReport({
        status: 'Verification failed',
        passed: false,
        verifiedAt: createTimestamp(),
        originalDirectCount: 0,
        originalClueCount: 0,
        remainingDirectCount: 0,
        remainingClueCount: 0,
        residualPatterns: ['Pipeline execution failed before verification completed.'],
        structuralCheckPassed: false,
        summary:
          'Verification failed (fail-closed). Export actions are disabled until the document processes cleanly.',
        recommendations: ['Inspect input format or reset custom rules, then try again.'],
      });
      setRedactionResult(null);
      setAppError(
        buildSafeAppError(
          'Privacy pipeline',
          err,
          'Inspect your document format and retry. Your original input is preserved.',
          true
        )
      );
      logAction('Pipeline failure (fail-closed)', 'Original input preserved; exports blocked');
    },
    [logAction]
  );

  useEffect(() => {
    if (!rawText.trim()) {
      setHasAnalyzed(false);
      setIsProcessing(false);
      setAnalysisStep('idle');
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
      setVerificationStatus('Not yet analysed');
      setVerificationReport(null);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);
    setVerificationStatus('Processing');
    setAnalysisStep('Validating input');

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const input: PipelineInput = {
        text: rawText,
        source: documentSource,
        options: sanitizationOptions,
        enabledDirectCategories,
        enabledContextCategories,
        customRules,
        additionalRedactions,
      };

      setAnalysisStep('Scanning supported patterns');

      // Use dedicated Web Worker for larger documents when supported in browser
      if (rawText.length >= WORKER_THRESHOLD_CHARS && typeof Worker !== 'undefined') {
        try {
          if (workerRef.current) {
            workerRef.current.terminate();
          }
          const worker = new Worker(
            new URL('../workers/documentProcessing.worker.ts', import.meta.url),
            { type: 'module' }
          );
          workerRef.current = worker;
          const reqId = generateSecureId('req');

          worker.onmessage = (
            evt: MessageEvent<{
              requestId: string;
              ok: boolean;
              result?: PipelineOutput;
              error?: string;
            }>
          ) => {
            if (cancelled || evt.data.requestId !== reqId) return;
            setAnalysisStep('Analysing exposure');
            if (evt.data.ok && evt.data.result) {
              applyPipelineSuccess(evt.data.result, rawText, documentSource);
            } else {
              applyPipelineFailure(new Error(evt.data.error || 'Worker failed.'));
            }
          };

          worker.onerror = () => {
            if (cancelled) return;
            // Graceful fallback to synchronous execution if worker fails to load
            try {
              const out = runPrivacyPipeline(input);
              applyPipelineSuccess(out, rawText, documentSource);
            } catch (syncErr) {
              applyPipelineFailure(syncErr);
            }
          };

          worker.postMessage({ requestId: reqId, input });
          return;
        } catch {
          // Fall back to synchronous execution below
        }
      }

      try {
        setAnalysisStep('Analysing exposure');
        const out = runPrivacyPipeline(input);
        if (!cancelled) {
          applyPipelineSuccess(out, rawText, documentSource);
        }
      } catch (err) {
        if (!cancelled) {
          applyPipelineFailure(err);
        }
      }
    }, 90);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    rawText,
    documentSource,
    sanitizationOptions,
    enabledDirectCategories,
    enabledContextCategories,
    customRules,
    additionalRedactions,
    rerunCounter,
    applyPipelineSuccess,
    applyPipelineFailure,
  ]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const loadSample = useCallback(
    (sampleId: string) => {
      const sample = SYNTHETIC_SAMPLES.find((s) => s.id === sampleId);
      if (!sample) return;
      setAppError(null);
      setAdditionalRedactions([]);
      setSimulationHistory([]);
      setEnabledDirectCategories(DEFAULT_ENABLED_DIRECT);
      setEnabledContextCategories(DEFAULT_ENABLED_CONTEXT);
      setFileSizeBytes(new TextEncoder().encode(sample.content).length);
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
      setAppError(null);
      setAnalysisStep('Parsing document');
      try {
        setIsProcessing(true);
        const extracted = await extractDocumentFromFile(file);
        setAdditionalRedactions([]);
        setSimulationHistory([]);
        setFileSizeBytes(file.size);
        setDocumentSource({
          ...extracted.source,
          fileName: sanitizeDisplayFilename(extracted.source.fileName),
        });
        setRawTextState(extracted.text);
        if (extracted.notice) {
          setStatusBanner({ kind: 'info', message: extracted.notice });
        } else {
          setStatusBanner({
            kind: 'success',
            message: `Loaded ${sanitizeDisplayFilename(file.name)} locally in browser memory.`,
          });
        }
        logAction(
          `${extracted.source.kind.toUpperCase()} document loaded`,
          `Extracted ${extracted.text.length} chars locally`
        );
      } catch (err) {
        setAnalysisStep('idle');
        setAppError(
          buildSafeAppError(
            'Document upload & parsing',
            err,
            'Choose a valid, unencrypted TXT, CSV, PDF, DOCX, or JSON file within size limits.',
            Boolean(rawText.trim())
          )
        );
        logAction('File upload rejected', 'Invalid, encrypted, empty, or unsupported local file');
      } finally {
        setIsProcessing(false);
      }
    },
    [logAction, rawText]
  );

  const rerunAnalysisNow = useCallback(() => {
    setRerunCounter((c) => c + 1);
  }, []);

  const clearAllData = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setRawTextState('');
    setDocumentSource({ kind: 'paste' });
    setFileSizeBytes(null);
    setCsvGrid(null);
    setIsCsvMode(false);
    setCsvStructureVerified(false);
    setCustomRules([]);
    setAdditionalRedactions([]);
    setEnabledDirectCategories(DEFAULT_ENABLED_DIRECT);
    setEnabledContextCategories(DEFAULT_ENABLED_CONTEXT);
    setHasAnalyzed(false);
    setAnalysisStep('idle');
    setDetectedEntities([]);
    setDetectionWarnings([]);
    setContextClues([]);
    setAppliedSpans([]);
    setRedactionResult(null);
    setSimulationResult(null);
    setSimulationHistory([]);
    setVerificationStatus('Not yet analysed');
    setVerificationReport(null);
    setAppError(null);
    lastLoggedSignatureRef.current = '';
    setStatusBanner({
      kind: 'success',
      message: 'Workspace cleared. All document content and in-memory mappings discarded.',
    });
    setActivityLog([
      {
        id: generateSecureId('log'),
        timestamp: createTimestamp(),
        action: 'Workspace cleared',
        detail: 'All in-memory document content and pseudonym maps discarded.',
      },
    ]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        rawText,
        setRawText,
        documentSource,
        fileSizeBytes,
        csvGrid,
        sanitizationMode: sanitizationOptions.mode,
        setSanitizationMode,
        sanitizationOptions,
        updateSanitizationOptions,
        enabledDirectCategories,
        toggleDirectCategory,
        enabledContextCategories,
        toggleContextCategory,
        customRules,
        addCustomRule,
        removeCustomRule,
        additionalRedactions,
        toggleAdditionalRedaction,
        applySingleRecommendation,
        hasAnalyzed,
        isProcessing,
        analysisStep,
        isCsvMode,
        detectedEntities,
        detectionWarnings,
        contextClues,
        appliedSpans,
        redactionResult,
        simulationResult,
        simulationHistory,
        verificationStatus,
        verificationReport,
        csvStructureVerified,
        activityLog,
        localSessions,
        statusBanner,
        appError,
        clearStatusBanner: () => setStatusBanner(null),
        clearAppError: () => setAppError(null),
        loadSample,
        loadUploadedFile,
        rerunAnalysisNow,
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
