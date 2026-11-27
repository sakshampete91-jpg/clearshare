import Papa from 'papaparse';
import type {
  ContextClue,
  CsvGrid,
  DetectedEntity,
  SanitizationMode,
} from '../../types/clearshare';
import { detectEntities } from '../detection/detectEntities';
import { detectContextClues } from '../context/detectContextClues';
import {
  InMemoryPseudonymRegistry,
  sanitizeText,
} from '../redaction/sanitizeDocument';

export interface CsvProcessingResult {
  originalGrid: CsvGrid;
  sanitizedGrid: CsvGrid;
  sanitizedCsvText: string;
  entities: DetectedEntity[];
  contextClues: ContextClue[];
  redactedDirectCount: number;
  redactedContextCount: number;
  pseudonymCount: number;
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
  mode: SanitizationMode,
  customPhrases: string[] = [],
  additionalRedactionValues: string[] = [],
  fileName = 'document.csv'
): CsvProcessingResult {
  const originalGrid = parseCsvToGrid(rawCsv, fileName);
  const registry = new InMemoryPseudonymRegistry();

  const allEntities: DetectedEntity[] = [];
  const allClues: ContextClue[] = [];
  let redactedDirectCount = 0;
  let redactedContextCount = 0;

  const additionalSet = new Set(
    additionalRedactionValues.map((v) => v.trim().toLowerCase()).filter(Boolean)
  );

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

      const cellClues = detectContextClues(cellValue, customPhrases).map((clue) => ({
        ...clue,
        rowIndex: r + 1,
        colIndex: c,
        columnName,
      }));
      allClues.push(...cellClues);

      const cluesToRedact = cellClues.filter((clue) =>
        additionalSet.has(clue.normalizedValue) || additionalSet.has(clue.value.toLowerCase())
      );

      const cellRedaction = sanitizeText(
        cellValue,
        cellDetection.entities,
        mode,
        cluesToRedact,
        registry
      );

      redactedDirectCount += cellRedaction.redactedDirectCount;
      redactedContextCount += cellRedaction.redactedContextCount;
      sanitizedRow.push(cellRedaction.sanitizedText);
    }

    sanitizedRows.push(sanitizedRow);
  }

  const sanitizedGrid: CsvGrid = {
    headers: [...originalGrid.headers],
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
    structureVerified,
  };
}
