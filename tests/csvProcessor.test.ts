import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { processCsvDocument } from '../src/engines/export/csvProcessor';

describe('CSV Processor', () => {
  it('preserves quoted commas, escaped quotes, empty cells, and newlines inside quoted fields', () => {
    const rawCsv = [
      'Name,Email,Phone,Notes',
      '"Sharma, Rahul","rahul@example.in","+91 9876543210","Reported ""urgent"" issue\non line two"',
      '"Meera Nair","rahul@example.in","","Empty phone cell"',
    ].join('\n');

    const result = processCsvDocument(rawCsv, 'pseudonymize');

    expect(result.structureVerified).toBe(true);
    expect(result.originalGrid.headers).toEqual(['Name', 'Email', 'Phone', 'Notes']);
    expect(result.originalGrid.rows).toHaveLength(2);
    expect(result.sanitizedGrid.rows[0][1]).toBe('EMAIL_01');
    expect(result.sanitizedGrid.rows[1][1]).toBe('EMAIL_01');
    expect(result.sanitizedGrid.rows[1][2]).toBe('');

    const reparsed = Papa.parse<string[]>(result.sanitizedCsvText, { header: false });
    expect(reparsed.errors).toHaveLength(0);
    expect(reparsed.data).toHaveLength(3);
    expect(reparsed.data[1][0]).toBe('Sharma, Rahul');
    expect(reparsed.data[1][3]).toContain('Reported "urgent" issue');
    expect(reparsed.data[1][3]).toContain('\n');
  });
});
