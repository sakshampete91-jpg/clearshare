import Papa from 'papaparse';
import type {
  ContextClue,
  ContextClueCategory,
  CsvGrid,
  CustomPatternRule,
  DetectedEntity,
  EntityCategory,
  SanitizationMode,
  SanitizationOptions,
} from '../../types/clearshare';
import { detectEntities } from '../detection/detectEntities';
import { detectContextClues } from '../context/detectContextClues';
import { InMemoryPseudonymRegistry } from '../redaction/sanitizeDocument';
import {
  DEFAULT_SANITIZATION_OPTIONS,
  detectCustomPatternClues,
  sanitizeWithOptions,
} from '../../services/sanitization/configuredSanitizer';
import { neutralizeCsvFormulaCell } from '../../security/inputGuards';

export interface CsvProcessingResult {
  originalGrid: CsvGrid;
  sanitizedGrid: CsvGrid;
  sanitizedCsvText: string;
  entities: DetectedEntity[];
  contextClues: ContextClue[];
  redactedDirectCount: number;
  redactedContextCount: number;
  pseudonymCount: number;
  formulaNeutralizedCount: number;
  structureVerified: boolean;
}

export function isLikelyCsvInput(_text: string, sourceKind?: string, fileName?: string): boolean {
  if (sourceKind === 'csv') return true;
  if (fileName && fileName.toLowerCase().endsWith('.csv')) return true;
  return false;
}

export function parseCsvToGrid(rawCsv: string, fileName = 'document.csv'): CsvGrid {
  const normalized = rawCsv.replace(/\r\n/g, '\n').replace(/\n$/, '');
  const parsed = Papa.parse<string[]>(normalized, {
    header: false,
    skipEmptyLines: false,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return { headers: [], rows: [], fileName };
  }

  const headers = rows[0].map((cell) => String(cell ?? ''));
  const dataRows = rows.slice(1).map((row) => row.map((cell) => String(cell ?? '')));

  return {
    headers,
    rows: dataRows,
    fileName,
  };
}

export function processCsvDocument(
  rawCsv: string,
  modeOrOptions: SanitizationMode | SanitizationOptions,
  customPhrases: string[] = [],
  additionalRedactionValues: string[] = [],
  fileName = 'document.csv',
  enabledDirectCategories?: EntityCategory[],
  enabledContextCategories?: ContextClueCategory[],
  customRules: CustomPatternRule[] = []
): CsvProcessingResult {
  const options: SanitizationOptions =
    typeof modeOrOptions === 'string'
      ? { ...DEFAULT_SANITIZATION_OPTIONS, mode: modeOrOptions }
      : modeOrOptions;

  const originalGrid = parseCsvToGrid(rawCsv, fileName);
  const registry = new InMemoryPseudonymRegistry();

  const allEntities: DetectedEntity[] = [];
  const allClues: ContextClue[] = [];
  let redactedDirectCount = 0;
  let redactedContextCount = 0;
  let formulaNeutralizedCount = 0;

  const additionalSet = new Set(
    additionalRedactionValues.map((v) => v.trim().toLowerCase()).filter(Boolean)
  );
  const directEnabledSet = enabledDirectCategories
    ? new Set(enabledDirectCategories)
    : null;
  const contextEnabledSet = enabledContextCategories
    ? new Set(enabledContextCategories)
    : null;

  const sanitizedRows: string[][] = [];

  for (let r = 0; r < originalGrid.rows.length; r++) {
    const row = originalGrid.rows[r];
    const sanitizedRow: string[] = [];

    for (let c = 0; c < row.length; c++) {
      const cellValue = row[c] ?? '';
      const columnName = originalGrid.headers[c] ?? `Column ${c + 1}`;

      if (!cellValue.trim()) {
        sanitizedRow.push(cellValue);
        continue;
      }

      const cellDetection = detectEntities(cellValue, {
        rowIndex: r + 1,
        colIndex: c,
        columnName,
      });
      allEntities.push(...cellDetection.entities);

      const entitiesToRedact = directEnabledSet
        ? cellDetection.entities.filter((e) => directEnabledSet.has(e.category))
        : cellDetection.entities;

      const baseClues = detectContextClues(cellValue, customPhrases);
      const customRuleClues = detectCustomPatternClues(cellValue, customRules);
      const cellClues = [...baseClues, ...customRuleClues].map((clue) => ({
        ...clue,
        rowIndex: r + 1,
        colIndex: c,
        columnName,
      }));
      allClues.push(...cellClues);

      const cluesToRedact = cellClues.filter(
        (clue) =>
          (contextEnabledSet ? contextEnabledSet.has(clue.category) : false) ||
          additionalSet.has(clue.normalizedValue) ||
          additionalSet.has(clue.value.toLowerCase())
      );

      const cellRedaction = sanitizeWithOptions(
        cellValue,
        entitiesToRedact,
        options,
        cluesToRedact,
        registry
      );

      redactedDirectCount += cellRedaction.redactedDirectCount;
      redactedContextCount += cellRedaction.redactedContextCount;
      const safeCell = neutralizeCsvFormulaCell(cellRedaction.sanitizedText);
      if (safeCell.neutralized) {
        formulaNeutralizedCount += 1;
      }
      sanitizedRow.push(safeCell.value);
    }

    sanitizedRows.push(sanitizedRow);
  }

  const safeHeaders = originalGrid.headers.map((h) => {
    const res = neutralizeCsvFormulaCell(h);
    if (res.neutralized) formulaNeutralizedCount += 1;
    return res.value;
  });

  const sanitizedGrid: CsvGrid = {
    headers: safeHeaders,
    rows: sanitizedRows,
    fileName,
  };

  const fullTable = [sanitizedGrid.headers, ...sanitizedGrid.rows];
  const sanitizedCsvText = Papa.unparse(fullTable, {
    quotes: false,
    newline: '\n',
  });

  // Re-parse the generated CSV to verify structure integrity
  const verification = Papa.parse<string[]>(sanitizedCsvText, {
    header: false,
    skipEmptyLines: false,
  });

  const expectedTotalRows = 1 + originalGrid.rows.length;
  const structureVerified =
    verification.errors.length === 0 &&
    verification.data.length === expectedTotalRows &&
    verification.data.every(
      (row, idx) =>
        row.length === (idx === 0 ? originalGrid.headers.length : originalGrid.rows[idx - 1].length)
    );

  if (!structureVerified) {
    throw new Error('Sanitized CSV failed structural re-verification.');
  }

  return {
    originalGrid,
    sanitizedGrid,
    sanitizedCsvText,
    entities: allEntities,
    contextClues: allClues,
    redactedDirectCount,
    redactedContextCount,
    pseudonymCount: registry.size,
    formulaNeutralizedCount,
    structureVerified,
  };
}
