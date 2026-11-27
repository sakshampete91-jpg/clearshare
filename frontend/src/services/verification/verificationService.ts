import Papa from 'papaparse';
import type {
  CustomPatternRule,
  ExposureSimulationResult,
  VerificationReport,
  VerificationStatus,
} from '../../types/clearshare';
import { detectEntities } from '../../engines/detection/detectEntities';
import { detectContextClues } from '../../engines/context/detectContextClues';
import { detectCustomPatternClues } from '../sanitization/configuredSanitizer';

export interface VerifyOutputInput {
  originalText: string;
  sanitizedText: string;
  isCsvMode: boolean;
  expectedCsvRowCount?: number;
  expectedCsvColCounts?: number[];
  originalDirectCount: number;
  originalClueCount: number;
  customRules: CustomPatternRule[];
  simulation: ExposureSimulationResult;
  sanitizationFailed?: boolean;
}

export function verifySanitizedOutput(input: VerifyOutputInput): VerificationReport {
  const verifiedAt = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (input.sanitizationFailed || (!input.sanitizedText && input.originalText.trim())) {
    return {
      status: 'Verification failed',
      passed: false,
      verifiedAt,
      originalDirectCount: input.originalDirectCount,
      originalClueCount: input.originalClueCount,
      remainingDirectCount: input.originalDirectCount,
      remainingClueCount: input.originalClueCount,
      residualPatterns: ['Sanitization output could not be generated safely.'],
      structuralCheckPassed: false,
      summary:
        'Verification failed (fail-closed): output sanitization did not complete cleanly. Downloads are disabled until resolved.',
      recommendations: ['Check transformation settings or reset invalid custom patterns.'],
    };
  }

  let structuralCheckPassed = true;
  if (input.isCsvMode) {
    const reparsed = Papa.parse<string[]>(input.sanitizedText, {
      header: false,
      skipEmptyLines: false,
    });
    const rowCountMatch =
      input.expectedCsvRowCount === undefined ||
      reparsed.data.length === input.expectedCsvRowCount;
    const colCountMatch =
      input.expectedCsvColCounts === undefined ||
      reparsed.data.every((r, idx) => r.length === input.expectedCsvColCounts?.[idx]);

    structuralCheckPassed = reparsed.errors.length === 0 && rowCountMatch && colCountMatch;
    if (!structuralCheckPassed) {
      return {
        status: 'Verification failed',
        passed: false,
        verifiedAt,
        originalDirectCount: input.originalDirectCount,
        originalClueCount: input.originalClueCount,
        remainingDirectCount: input.simulation.remainingDirectEntities.length,
        remainingClueCount: input.simulation.remainingContextClues.length,
        residualPatterns: ['Sanitized CSV structure deviated from original grid dimensions.'],
        structuralCheckPassed: false,
        summary:
          'Verification failed: sanitized CSV failed independent re-parse structure check. Export blocked.',
        recommendations: ['Inspect quoted fields or export as plain text instead.'],
      };
    }
  }

  // Independent re-scan of the transformed output
  const reDetectedDirect = detectEntities(input.sanitizedText);
  const literalPhrases = input.customRules
    .filter((r) => r.kind === 'literal')
    .map((r) => r.pattern);
  const regexRules = input.customRules.filter((r) => r.kind === 'regex');
  const reDetectedClues = [
    ...detectContextClues(input.sanitizedText, literalPhrases),
    ...detectCustomPatternClues(input.sanitizedText, regexRules),
  ];

  const remainingDirectCount = reDetectedDirect.entities.length;
  const remainingClueCount = reDetectedClues.length;

  const residualPatterns: string[] = [];
  if (remainingDirectCount > 0) {
    const cats = Array.from(new Set(reDetectedDirect.entities.map((e) => e.category)));
    residualPatterns.push(
      `${remainingDirectCount} unmasked direct identifier(s): ${cats.join(', ')}`
    );
  }
  if (remainingClueCount > 0) {
    const cats = Array.from(new Set(reDetectedClues.map((c) => c.category)));
    residualPatterns.push(
      `${remainingClueCount} contextual clue(s) remain: ${cats.join(', ')}`
    );
  }

  let status: VerificationStatus;
  let summary: string;

  if (remainingDirectCount > 0) {
    status = 'Exposure detected';
    summary = `Independent re-analysis found ${remainingDirectCount} unmasked direct identifier(s) in the sanitized output.`;
  } else if (remainingClueCount > 0 || input.simulation.linkabilityFindings.length > 0) {
    status = 'Residual exposure detected';
    summary = `Direct identifiers were removed, but ${remainingClueCount} indirect contextual clue(s) and ${input.simulation.linkabilityFindings.length} linkable combination(s) remain.`;
  } else {
    status = 'No supported patterns detected';
    summary =
      'Independent re-analysis found no supported direct or contextual patterns in the sanitized output. Note: this does not guarantee complete anonymity.';
  }

  const recommendations = input.simulation.recommendations
    .filter((r) => !r.applied)
    .slice(0, 5)
    .map((r) => r.label);

  return {
    status,
    passed: true,
    verifiedAt,
    originalDirectCount: input.originalDirectCount,
    originalClueCount: input.originalClueCount,
    remainingDirectCount,
    remainingClueCount,
    residualPatterns,
    structuralCheckPassed,
    summary,
    recommendations,
  };
}
