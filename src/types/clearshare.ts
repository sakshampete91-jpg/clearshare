export type ScreenId =
  | 'workspace'
  | 'analysis'
  | 'simulator'
  | 'comparison'
  | 'export';

export type EntityCategory =
  | 'EMAIL'
  | 'PHONE'
  | 'IPV4'
  | 'PAN'
  | 'AADHAAR'
  | 'CARD'
  | 'API_KEY';

export type SanitizationMode =
  | 'full_mask'
  | 'partial_mask'
  | 'pseudonymize';

export type MaskingChar = '*' | 'X' | '#' | '•';

export interface SanitizationOptions {
  mode: SanitizationMode;
  maskChar: MaskingChar;
  fullMaskStyle: 'token' | 'char_block';
  partialTrailingDigits: 2 | 4;
  partialKeepEmailDomain: boolean;
  partialKeepDateYear: boolean;
  consistentPseudonyms: boolean;
}

export interface CustomPatternRule {
  id: string;
  label: string;
  pattern: string;
  kind: 'literal' | 'regex';
}

export type ValidationStatus =
  | 'valid'
  | 'format_only'
  | 'uncertain'
  | 'invalid_checksum';

export interface DetectedEntity {
  id: string;
  category: EntityCategory;
  rawValue: string;
  normalizedValue: string;
  start: number;
  end: number;
  status: ValidationStatus;
  statusNote: string;
  rowIndex?: number;
  colIndex?: number;
  columnName?: string;
}

export type ContextClueCategory =
  | 'PERSON_NAME'
  | 'LOCATION'
  | 'DATE'
  | 'ORGANIZATION'
  | 'TICKET_REF'
  | 'ACCOUNT_REF'
  | 'REPEATED_ID'
  | 'CUSTOM_PHRASE'
  | 'UNCERTAIN';

export interface ContextClue {
  id: string;
  category: ContextClueCategory;
  value: string;
  normalizedValue: string;
  start: number;
  end: number;
  confidence: 'high' | 'moderate' | 'uncertain';
  reason: string;
  rowIndex?: number;
  colIndex?: number;
  columnName?: string;
}

export interface LinkabilityFinding {
  id: string;
  title: string;
  cluesInvolved: string[];
  whyItMatters: string;
  potentialInference: string;
  recommendation: string;
  severity: 'high' | 'moderate';
}

export interface RecommendationItem {
  id: string;
  label: string;
  description: string;
  targetType: 'context_clue' | 'direct_entity' | 'custom_phrase';
  targetValue: string;
  category: ContextClueCategory | EntityCategory;
  applied: boolean;
}

export type ExposureLevel = 'Low' | 'Moderate' | 'High';

export interface ExposureSimulationResult {
  level: ExposureLevel;
  scorePoints: number;
  reasons: string[];
  remainingDirectEntities: DetectedEntity[];
  remainingContextClues: ContextClue[];
  linkabilityFindings: LinkabilityFinding[];
  unresolvedFindings: string[];
  recommendations: RecommendationItem[];
  redactionCoveragePercent: number;
  totalOriginalFindings: number;
  redactedCount: number;
  remainingCount: number;
}

export type VerificationStatus =
  | 'Not yet analysed'
  | 'Processing'
  | 'Verification required'
  | 'Exposure detected'
  | 'Residual exposure detected'
  | 'No supported patterns detected'
  | 'Verification failed';

export interface VerificationReport {
  status: VerificationStatus;
  passed: boolean;
  verifiedAt: string;
  originalDirectCount: number;
  originalClueCount: number;
  remainingDirectCount: number;
  remainingClueCount: number;
  residualPatterns: string[];
  structuralCheckPassed: boolean;
  summary: string;
  recommendations: string[];
}

export interface SimulationSnapshot {
  runNumber: number;
  level: ExposureLevel;
  scorePoints: number;
  remainingDirectCount: number;
  remainingClueCount: number;
  linkabilityCount: number;
  mode: SanitizationMode;
  additionalRedactionsCount: number;
}

export interface CsvGrid {
  headers: string[];
  rows: string[][];
  fileName: string;
}

export interface DocumentSource {
  kind: 'paste' | 'txt' | 'csv' | 'pdf' | 'docx' | 'json' | 'sample';
  fileName?: string;
  sampleId?: string;
}

export interface RedactionResult {
  sanitizedText: string;
  sanitizedCsv: CsvGrid | null;
  redactedDirectCount: number;
  redactedContextCount: number;
  pseudonymCount: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
}

export interface LocalSessionSummary {
  id: string;
  timestamp: string;
  sourceLabel: string;
  mode: SanitizationMode;
  detectedCount: number;
  redactedCount: number;
  verificationStatus: VerificationStatus;
}

export interface AppErrorInfo {
  id: string;
  operation: string;
  whatHappened: string;
  originalPreserved: boolean;
  nextStep: string;
}

export interface SyntheticSample {
  id: string;
  title: string;
  category: string;
  description: string;
  format: 'txt' | 'csv';
  content: string;
}
