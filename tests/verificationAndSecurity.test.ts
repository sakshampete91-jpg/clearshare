import { describe, expect, it } from 'vitest';
import { detectEntities } from '../src/engines/detection/detectEntities';
import {
  DEFAULT_SANITIZATION_OPTIONS,
  detectCustomPatternClues,
  sanitizeWithOptions,
} from '../src/services/sanitization/configuredSanitizer';
import {
  containsHtmlLikeMarkup,
  validateCustomRegexPattern,
} from '../src/security/inputGuards';
import { verifySanitizedOutput } from '../src/services/verification/verificationService';
import {
  buildPrivacyAnalysisReport,
  formatPrivacyReportAsText,
} from '../src/services/reporting/reportService';
import { runPrivacyPipeline } from '../src/services/pipeline/pipelineOrchestrator';
import { DEFAULT_ENABLED_CONTEXT, DEFAULT_ENABLED_DIRECT } from '../src/app/AppContext';

describe('Verification, Security, & Edge Cases', () => {
  it('preserves Unicode and special characters cleanly while sanitizing adjacent PII', () => {
    const unicodeText =
      'नमस्ते Rahul — email rahul.dev@example.in, phone +91 98765-43210, café ☕ & €100.';
    const { entities } = detectEntities(unicodeText);
    const out = sanitizeWithOptions(unicodeText, entities, {
      ...DEFAULT_SANITIZATION_OPTIONS,
      mode: 'full_mask',
    });

    expect(out.sanitizedText).toBe(
      'नमस्ते Rahul — email [REDACTED], phone [REDACTED], café ☕ & €100.'
    );
  });

  it('flags HTML/script injection payloads safely and rejects ReDoS custom regexes', () => {
    const payload = '<script>alert(1)</script> <img src=x onerror=alert(1)>';
    expect(containsHtmlLikeMarkup(payload)).toBe(true);

    const redos = validateCustomRegexPattern('(a+)+b');
    expect(redos.valid).toBe(false);
    expect(redos.reason).toMatch(/ReDoS/i);

    const validCustom = validateCustomRegexPattern('EMP-\\d{4}');
    expect(validCustom.valid).toBe(true);
    const matches = detectCustomPatternClues('Assigned EMP-4821 and EMP-9902', [
      { id: '1', label: 'Employee ID', pattern: 'EMP-\\d{4}', kind: 'regex' },
    ]);
    expect(matches).toHaveLength(2);
  });

  it('supports configurable masking characters, partial domain masking, trailing digits, and non-consistent pseudonyms', () => {
    const text = 'Primary rahul@example.in, repeat rahul@example.in, phone 9876543210.';
    const { entities } = detectEntities(text);

    const partial = sanitizeWithOptions(text, entities, {
      ...DEFAULT_SANITIZATION_OPTIONS,
      mode: 'partial_mask',
      maskChar: 'X',
      partialTrailingDigits: 2,
      partialKeepEmailDomain: false,
    });
    expect(partial.sanitizedText).toContain('rXXXX@eXXXX.in');
    expect(partial.sanitizedText).toContain('XXXXXXXX10');

    const nonConsistent = sanitizeWithOptions(text, entities, {
      ...DEFAULT_SANITIZATION_OPTIONS,
      mode: 'pseudonymize',
      consistentPseudonyms: false,
    });
    expect(nonConsistent.sanitizedText).toContain('EMAIL_U01');
    expect(nonConsistent.sanitizedText).toContain('EMAIL_U02');
  });

  it('fails closed on verification failure and reports honest residual statuses', () => {
    const failed = verifySanitizedOutput({
      originalText: 'rahul@example.in',
      sanitizedText: '',
      isCsvMode: false,
      originalDirectCount: 1,
      originalClueCount: 0,
      customRules: [],
      simulation: {
        level: 'Low',
        scorePoints: 0,
        reasons: [],
        remainingDirectEntities: [],
        remainingContextClues: [],
        linkabilityFindings: [],
        unresolvedFindings: [],
        recommendations: [],
        redactionCoveragePercent: 0,
        totalOriginalFindings: 1,
        redactedCount: 0,
        remainingCount: 0,
      },
      sanitizationFailed: true,
    });
    expect(failed.status).toBe('Verification failed');
    expect(failed.passed).toBe(false);

    // Unmasked direct identifier triggers "Exposure detected"
    const pipelineExposure = runPrivacyPipeline({
      text: 'Email: rahul@example.in',
      source: { kind: 'paste' },
      options: DEFAULT_SANITIZATION_OPTIONS,
      enabledDirectCategories: [], // user disabled EMAIL
      enabledContextCategories: DEFAULT_ENABLED_CONTEXT,
      customRules: [],
      additionalRedactions: [],
    });
    expect(pipelineExposure.verificationReport.status).toBe('Exposure detected');
  });

  it('builds Privacy Analysis Reports without any original PII or raw secrets', () => {
    const raw =
      'Ticket TKT-48291: rahul.sharma@example.in key sk-proj-synthetic99demoKeyForClearshareTest01';
    const pipeline = runPrivacyPipeline({
      text: raw,
      source: { kind: 'txt', fileName: 'secret.txt' },
      options: DEFAULT_SANITIZATION_OPTIONS,
      enabledDirectCategories: DEFAULT_ENABLED_DIRECT,
      enabledContextCategories: DEFAULT_ENABLED_CONTEXT,
      customRules: [],
      additionalRedactions: [],
    });

    const report = buildPrivacyAnalysisReport({
      source: { kind: 'txt', fileName: 'secret.txt' },
      options: DEFAULT_SANITIZATION_OPTIONS,
      redaction: pipeline.redactionResult,
      simulation: pipeline.simulationResult,
      verification: pipeline.verificationReport,
    });

    const jsonText = JSON.stringify(report);
    const txtReport = formatPrivacyReportAsText(report);

    expect(jsonText).not.toContain('rahul.sharma@example.in');
    expect(jsonText).not.toContain('sk-proj-synthetic99demoKeyForClearshareTest01');
    expect(txtReport).toContain('CLEARSHARE — PRIVACY ANALYSIS & VERIFICATION REPORT');
    expect(txtReport).not.toContain('rahul.sharma@example.in');
  });

  it('handles large multi-thousand-line documents cleanly within budget', () => {
    const line = 'Contact user@example.in or +91 9876543210 from Pune on 12 October 2026.';
    const largeDoc = Array.from({ length: 1000 }, () => line).join('\n');

    const start = performance.now();
    const out = runPrivacyPipeline({
      text: largeDoc,
      source: { kind: 'paste' },
      options: DEFAULT_SANITIZATION_OPTIONS,
      enabledDirectCategories: DEFAULT_ENABLED_DIRECT,
      enabledContextCategories: DEFAULT_ENABLED_CONTEXT,
      customRules: [],
      additionalRedactions: [],
    });
    const elapsedMs = performance.now() - start;

    expect(out.detectedEntities).toHaveLength(2000);
    expect(out.redactionResult.redactedDirectCount).toBe(2000);
    expect(elapsedMs).toBeLessThan(3000);
  });
});
