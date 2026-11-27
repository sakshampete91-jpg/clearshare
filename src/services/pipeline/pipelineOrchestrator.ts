import type {
  ContextClue,
  ContextClueCategory,
  CsvGrid,
  CustomPatternRule,
  DetectedEntity,
  DocumentSource,
  EntityCategory,
  ExposureSimulationResult,
  RedactionResult,
  SanitizationOptions,
  VerificationReport,
} from '../../types/clearshare';
import { detectEntities, type DetectionWarning } from '../../engines/detection/detectEntities';
import { detectContextClues } from '../../engines/context/detectContextClues';
import {
  InMemoryPseudonymRegistry,
  type RedactionSpan,
} from '../../engines/redaction/sanitizeDocument';
import { runExposureSimulation } from '../../engines/simulation/runExposureSimulation';
import {
  isLikelyCsvInput,
  processCsvDocument,
} from '../../engines/export/csvProcessor';
import {
  detectCustomPatternClues,
  sanitizeWithOptions,
} from '../sanitization/configuredSanitizer';
import { verifySanitizedOutput } from '../verification/verificationService';

export interface PipelineInput {
  text: string;
  source: DocumentSource;
  options: SanitizationOptions;
  enabledDirectCategories: EntityCategory[];
  enabledContextCategories: ContextClueCategory[];
  customRules: CustomPatternRule[];
  additionalRedactions: string[];
}

export interface PipelineOutput {
  isCsvMode: boolean;
  csvGrid: CsvGrid | null;
  csvStructureVerified: boolean;
  detectedEntities: DetectedEntity[];
  detectionWarnings: DetectionWarning[];
  contextClues: ContextClue[];
  appliedSpans: RedactionSpan[];
  redactionResult: RedactionResult;
  simulationResult: ExposureSimulationResult;
  verificationReport: VerificationReport;
}

export function runPrivacyPipeline(input: PipelineInput): PipelineOutput {
  const literalPhrases = input.customRules
    .filter((r) => r.kind === 'literal')
    .map((r) => r.pattern);
  const regexRules = input.customRules.filter((r) => r.kind === 'regex');

  const useCsv = isLikelyCsvInput(
    input.text,
    input.source.kind,
    input.source.fileName
  );

  if (useCsv) {
    const csvOut = processCsvDocument(
      input.text,
      input.options,
      literalPhrases,
      input.additionalRedactions,
      input.source.fileName ?? 'document.csv',
      input.enabledDirectCategories,
      input.enabledContextCategories,
      regexRules
    );

    const simulationResult = runExposureSimulation({
      sanitizedText: csvOut.sanitizedCsvText,
      mode: input.options.mode,
      originalDirectEntitiesCount: csvOut.entities.length,
      originalContextCluesCount: csvOut.contextClues.length,
      customPhrases: literalPhrases,
      appliedAdditionalRedactions: input.additionalRedactions,
    });

    const verificationReport = verifySanitizedOutput({
      originalText: input.text,
      sanitizedText: csvOut.sanitizedCsvText,
      isCsvMode: true,
      expectedCsvRowCount: 1 + csvOut.originalGrid.rows.length,
      expectedCsvColCounts: [
        csvOut.originalGrid.headers.length,
        ...csvOut.originalGrid.rows.map((r) => r.length),
      ],
      originalDirectCount: csvOut.entities.length,
      originalClueCount: csvOut.contextClues.length,
      customRules: input.customRules,
      simulation: simulationResult,
      sanitizationFailed: !csvOut.structureVerified,
    });

    return {
      isCsvMode: true,
      csvGrid: csvOut.originalGrid,
      csvStructureVerified: csvOut.structureVerified,
      detectedEntities: csvOut.entities,
      detectionWarnings: [],
      contextClues: csvOut.contextClues,
      appliedSpans: [],
      redactionResult: {
        sanitizedText: csvOut.sanitizedCsvText,
        sanitizedCsv: csvOut.sanitizedGrid,
        redactedDirectCount: csvOut.redactedDirectCount,
        redactedContextCount: csvOut.redactedContextCount,
        pseudonymCount: csvOut.pseudonymCount,
      },
      simulationResult,
      verificationReport,
    };
  }

  // Plain text / JSON / extracted PDF / extracted DOCX pipeline
  const detection = detectEntities(input.text);
  const baseClues = detectContextClues(input.text, literalPhrases);
  const regexClues = detectCustomPatternClues(input.text, regexRules);
  const clues = [...baseClues, ...regexClues].sort((a, b) => a.start - b.start);

  const directSet = new Set(input.enabledDirectCategories);
  const contextSet = new Set(input.enabledContextCategories);
  const extraSet = new Set(
    input.additionalRedactions.map((v) => v.trim().toLowerCase()).filter(Boolean)
  );

  const entitiesToRedact = detection.entities.filter((e) => directSet.has(e.category));
  const cluesToRedact = clues.filter(
    (c) =>
      contextSet.has(c.category) ||
      extraSet.has(c.normalizedValue) ||
      extraSet.has(c.value.toLowerCase())
  );

  const registry = new InMemoryPseudonymRegistry();
  const redacted = sanitizeWithOptions(
    input.text,
    entitiesToRedact,
    input.options,
    cluesToRedact,
    registry
  );

  const simulationResult = runExposureSimulation({
    sanitizedText: redacted.sanitizedText,
    mode: input.options.mode,
    originalDirectEntitiesCount: detection.entities.length,
    originalContextCluesCount: clues.length,
    customPhrases: literalPhrases,
    appliedAdditionalRedactions: input.additionalRedactions,
  });

  const verificationReport = verifySanitizedOutput({
    originalText: input.text,
    sanitizedText: redacted.sanitizedText,
    isCsvMode: false,
    originalDirectCount: detection.entities.length,
    originalClueCount: clues.length,
    customRules: input.customRules,
    simulation: simulationResult,
  });

  return {
    isCsvMode: false,
    csvGrid: null,
    csvStructureVerified: false,
    detectedEntities: detection.entities,
    detectionWarnings: detection.warnings,
    contextClues: clues,
    appliedSpans: redacted.appliedSpans,
    redactionResult: {
      sanitizedText: redacted.sanitizedText,
      sanitizedCsv: null,
      redactedDirectCount: redacted.redactedDirectCount,
      redactedContextCount: redacted.redactedContextCount,
      pseudonymCount: registry.size,
    },
    simulationResult,
    verificationReport,
  };
}
