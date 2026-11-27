import type {
  DocumentSource,
  ExposureSimulationResult,
  RedactionResult,
  SanitizationOptions,
  VerificationReport,
} from '../../types/clearshare';

export interface PrivacyAnalysisReport {
  product: 'CLEARSHARE';
  generatedAt: string;
  processingEnvironment: 'Browser-local memory only (zero server transmission)';
  sourceType: DocumentSource['kind'];
  sanitizationOptions: SanitizationOptions;
  counts: {
    originalDirectEntities: number;
    originalContextClues: number;
    redactedDirect: number;
    redactedContext: number;
    remainingDirect: number;
    remainingContextClues: number;
  };
  verification: VerificationReport;
  exposureAssessment: {
    level: ExposureSimulationResult['level'];
    ruleScorePoints: number;
    coveragePercent: number;
    reasons: string[];
    linkabilityWarnings: Array<{
      title: string;
      severity: string;
      whyItMatters: string;
      recommendation: string;
    }>;
  };
  disclaimer: string;
}

export function buildPrivacyAnalysisReport(params: {
  source: DocumentSource;
  options: SanitizationOptions;
  redaction: RedactionResult;
  simulation: ExposureSimulationResult;
  verification: VerificationReport;
}): PrivacyAnalysisReport {
  return {
    product: 'CLEARSHARE',
    generatedAt: new Date().toISOString(),
    processingEnvironment: 'Browser-local memory only (zero server transmission)',
    sourceType: params.source.kind,
    sanitizationOptions: { ...params.options },
    counts: {
      originalDirectEntities: params.verification.originalDirectCount,
      originalContextClues: params.verification.originalClueCount,
      redactedDirect: params.redaction.redactedDirectCount,
      redactedContext: params.redaction.redactedContextCount,
      remainingDirect: params.verification.remainingDirectCount,
      remainingContextClues: params.verification.remainingClueCount,
    },
    verification: params.verification,
    exposureAssessment: {
      level: params.simulation.level,
      ruleScorePoints: params.simulation.scorePoints,
      coveragePercent: params.simulation.redactionCoveragePercent,
      reasons: params.simulation.reasons,
      linkabilityWarnings: params.simulation.linkabilityFindings.map((f) => ({
        title: f.title,
        severity: f.severity,
        whyItMatters: f.whyItMatters,
        recommendation: f.recommendation,
      })),
    },
    disclaimer:
      'CLEARSHARE reports contain aggregate counts, verification statuses, and rule-based risk notes only. Original document text, extracted values, and pseudonym mappings are never included. No automated tool guarantees complete anonymity.',
  };
}

export function formatPrivacyReportAsText(report: PrivacyAnalysisReport): string {
  const lines = [
    'CLEARSHARE — PRIVACY ANALYSIS & VERIFICATION REPORT',
    `Generated: ${report.generatedAt}`,
    `Environment: ${report.processingEnvironment}`,
    `Source Format: ${report.sourceType.toUpperCase()}`,
    '',
    '--- SANITIZATION STRATEGY ---',
    `Mode: ${report.sanitizationOptions.mode}`,
    `Masking Character: ${report.sanitizationOptions.maskChar}`,
    `Consistent Pseudonyms: ${report.sanitizationOptions.consistentPseudonyms ? 'Yes (session memory only)' : 'No (unique per occurrence)'}`,
    '',
    '--- COUNTS ---',
    `Original Direct Identifiers: ${report.counts.originalDirectEntities}`,
    `Original Contextual Clues: ${report.counts.originalContextClues}`,
    `Redacted Direct: ${report.counts.redactedDirect}`,
    `Redacted Context Clues: ${report.counts.redactedContext}`,
    `Remaining Direct: ${report.counts.remainingDirect}`,
    `Remaining Context Clues: ${report.counts.remainingContextClues}`,
    '',
    '--- INDEPENDENT VERIFICATION ---',
    `Status: ${report.verification.status}`,
    `Summary: ${report.verification.summary}`,
    '',
    '--- EXPOSURE ASSESSMENT (RULE-BASED) ---',
    `Level: ${report.exposureAssessment.level} (${report.exposureAssessment.ruleScorePoints} pts)`,
    `Coverage: ${report.exposureAssessment.coveragePercent}%`,
    ...report.exposureAssessment.reasons.map((r) => `  * ${r}`),
    '',
    '--- LINKABILITY FINDINGS ---',
    ...(report.exposureAssessment.linkabilityWarnings.length === 0
      ? ['  None flagged by deterministic rules.']
      : report.exposureAssessment.linkabilityWarnings.map(
          (w) => `  * [${w.severity.toUpperCase()}] ${w.title} — ${w.recommendation}`
        )),
    '',
    '--- DISCLAIMER ---',
    report.disclaimer,
  ];
  return lines.join('\n');
}
