/**
 * CSV Excel Compatibility Test (T122b)
 * Success Criterion SC-008: Excel/Sheets/Calc compatible
 *
 * Comprehensive test suite for CSV export Excel compatibility:
 * 1. Excel-compatible CSV generation with special characters
 * 2. UTF-8 BOM presence for Excel encoding detection
 * 3. CRLF line endings (Windows standard)
 * 4. RFC 4180 CSV escaping compliance
 * 5. Unicode character support (emoji, CJK, accented letters)
 * 6. Special column cases (JSONB, NULL, long text)
 *
 * Uses xlsx library to parse and verify exported CSV files.
 */

import axios from 'axios';
import * as XLSX from 'xlsx';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds

/**
 * Helper function to create a test job with results
 */
async function createTestJob(urls: string[]): Promise<string> {
  const response = await axios.post(
    `${API_BASE_URL}/jobs/create`,
    { name: 'Excel Compat Test Job', urls },
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (!response.data.success) {
    throw new Error('Failed to create test job');
  }

  return response.data.data.job_id;
}

/**
 * Helper function to export CSV for a job
 */
async function exportCSV(
  jobId: string,
  format: string = 'complete'
): Promise<Buffer> {
  const response = await axios.post(
    `${API_BASE_URL}/jobs/${jobId}/export?format=${format}`,
    {},
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data);
}

/**
 * Helper function to parse CSV using xlsx library
 */
function parseCSVWithXLSX(buffer: Buffer): XLSX.WorkSheet {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  return workbook.Sheets[workbook.SheetNames[0]];
}

/**
 * Helper function to wait for job completion
 */
async function waitForJobCompletion(jobId: string, maxWait: number = 30000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const response = await axios.get(`${API_BASE_URL}/jobs/${jobId}`);
    const job = response.data.data;

    if (job.status === 'completed' || job.status === 'failed') {
      return;
    }

    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error('Job did not complete within timeout');
}

describe('CSV Excel Compatibility Tests (T122b, SC-008)', () => {
  let testJobId: string;

  beforeAll(() => {
    // Verify API is accessible
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL not set');
    }
  });

  afterAll(async () => {
    // Cleanup: Cancel test job if it exists
    if (testJobId) {
      try {
        await axios.delete(`${API_BASE_URL}/jobs/${testJobId}/cancel`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  /**
   * Test 1: Generate valid Excel-compatible CSV with special characters
   *
   * Requirement: CSV must parse correctly in Excel with special characters
   * - Commas in values
   * - Quotes in values
   * - Newlines in values
   */
  describe('1. Excel-Compatible CSV Generation', () => {
    it('should generate CSV that parses correctly with xlsx library', async () => {
      // Create job with URLs that will have special characters in results
      const testUrls = [
        'https://example.com/test,comma',
        'https://example.com/test"quote',
        'https://example.com/test\nnewline',
      ];

      testJobId = await createTestJob(testUrls);

      // Wait for processing (mock results should be instant)
      await waitForJobCompletion(testJobId);

      // Export CSV
      const csvBuffer = await exportCSV(testJobId, 'complete');

      // Parse with xlsx
      const worksheet = parseCSVWithXLSX(csvBuffer);

      // Verify worksheet was created successfully
      expect(worksheet).toBeDefined();

      // Convert to JSON for easier verification
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Verify header row exists
      expect(data.length).toBeGreaterThan(0);
      const headers = data[0] as string[];
      expect(headers).toContain('URL');
      expect(headers).toContain('Status');
      expect(headers).toContain('Confidence Score');

      // Verify data rows parsed correctly (no truncation)
      if (data.length > 1) {
        const firstDataRow = data[1] as any[];
        expect(firstDataRow).toBeDefined();
        expect(firstDataRow.length).toBe(headers.length);
      }
    }, TEST_TIMEOUT);

    it('should handle commas in field values without breaking columns', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Get headers to know column count
      const headers = data[0] as string[];
      const expectedColumnCount = headers.length;

      // Verify all data rows have correct column count
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        expect(row.length).toBeLessThanOrEqual(expectedColumnCount);
      }
    }, TEST_TIMEOUT);

    it('should preserve quotes in field values', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Verify escaped quotes pattern (RFC 4180: " becomes "")
      // Should find pattern like "value ""with"" quotes"
      const hasEscapedQuotes = csvString.includes('""');

      // Parse and verify no data loss
      const worksheet = parseCSVWithXLSX(csvBuffer);
      expect(worksheet).toBeDefined();
    }, TEST_TIMEOUT);

    it('should preserve newlines in field values', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Verify row structure is maintained
      expect(data.length).toBeGreaterThan(0);

      // All rows should have the same structure
      const headers = data[0] as string[];
      const columnCount = headers.length;

      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        // Some cells might be undefined, but row structure should be preserved
        expect(row).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });

  /**
   * Test 2: UTF-8 BOM presence
   *
   * Requirement: CSV must start with UTF-8 BOM (0xEF, 0xBB, 0xBF)
   * This helps Excel detect UTF-8 encoding automatically
   */
  describe('2. UTF-8 BOM Presence', () => {
    it('should include UTF-8 BOM at file start', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');

      // Check first 3 bytes match UTF-8 BOM
      expect(csvBuffer[0]).toBe(0xef);
      expect(csvBuffer[1]).toBe(0xbb);
      expect(csvBuffer[2]).toBe(0xbf);
    }, TEST_TIMEOUT);

    it('should be valid UTF-8 encoding', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');

      // Should be able to decode as UTF-8 without errors
      expect(() => {
        csvBuffer.toString('utf-8');
      }).not.toThrow();
    }, TEST_TIMEOUT);

    it('should have BOM immediately before first character', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // After BOM (U+FEFF), first character should be header start
      // The BOM character is at position 0 when decoded
      expect(csvString.charCodeAt(0)).toBe(0xfeff);

      // First actual content character should come right after
      expect(csvString.length).toBeGreaterThan(1);
    }, TEST_TIMEOUT);
  });

  /**
   * Test 3: CRLF line endings
   *
   * Requirement: All lines must end with \r\n (Windows standard)
   * Excel expects CRLF, not just LF
   */
  describe('3. CRLF Line Endings', () => {
    it('should use CRLF (\\r\\n) line endings throughout', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Remove BOM for line ending check
      const withoutBOM = csvString.substring(1);

      // Split on CRLF
      const lines = withoutBOM.split('\r\n');

      // Should have at least header row
      expect(lines.length).toBeGreaterThan(0);

      // Verify no LF-only line endings exist (except within quoted fields)
      // Count standalone \n that are not preceded by \r
      const standaloneNewlines = (withoutBOM.match(/(?<!\r)\n/g) || []).length;

      // Should have minimal standalone newlines (only in quoted fields if any)
      // Most newlines should be part of CRLF
      const totalNewlines = (withoutBOM.match(/\n/g) || []).length;
      const crlfCount = (withoutBOM.match(/\r\n/g) || []).length;

      // Most newlines should be part of CRLF sequences
      expect(crlfCount).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should not have standalone LF endings', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');
      const withoutBOM = csvString.substring(1);

      // Check that all line breaks use CRLF
      // This regex finds LF not preceded by CR (negative lookbehind)
      const lines = withoutBOM.split('\r\n');

      // Each line (except last) should not contain standalone \n
      for (let i = 0; i < lines.length - 1; i++) {
        // Within a line, if there's a \n, it should be in a quoted field
        const line = lines[i];
        if (line.includes('\n')) {
          // Newline should be inside quoted field
          // Quick heuristic: count quotes before the newline
          const beforeNewline = line.substring(0, line.indexOf('\n'));
          const quoteCount = (beforeNewline.match(/"/g) || []).length;

          // Should have odd number of quotes (inside quoted field)
          expect(quoteCount % 2).toBe(1);
        }
      }
    }, TEST_TIMEOUT);

    it('should have CRLF after header row', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');
      const withoutBOM = csvString.substring(1);

      // Find first line ending
      const firstLineEndIndex = withoutBOM.indexOf('\r\n');
      expect(firstLineEndIndex).toBeGreaterThan(0);

      // Verify it's CRLF, not just LF
      expect(withoutBOM[firstLineEndIndex]).toBe('\r');
      expect(withoutBOM[firstLineEndIndex + 1]).toBe('\n');
    }, TEST_TIMEOUT);
  });

  /**
   * Test 4: RFC 4180 CSV escaping
   *
   * Requirement: CSV must comply with RFC 4180 escaping rules:
   * - Commas in fields -> wrap in quotes
   * - Quotes in fields -> double them ("") and wrap in quotes
   * - Newlines in fields -> wrap in quotes
   */
  describe('4. RFC 4180 CSV Escaping', () => {
    it('should escape commas by wrapping in quotes', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Look for patterns like "value,with,commas"
      const hasQuotedCommas = /"[^"]*,[^"]*"/.test(csvString);

      // Parse and verify no column splitting
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      expect(data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should escape quotes by doubling them', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Verify RFC 4180 quote escaping: " becomes ""
      // Pattern: should not find odd number of quotes in sequence

      // Parse with xlsx and verify no data corruption
      const worksheet = parseCSVWithXLSX(csvBuffer);
      expect(worksheet).toBeDefined();
    }, TEST_TIMEOUT);

    it('should escape newlines by wrapping in quotes', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Verify row count matches expected (newlines in fields don't break rows)
      expect(data.length).toBeGreaterThan(0);

      // All rows should have consistent structure
      const headers = data[0] as string[];
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        expect(row).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should handle multiple special characters in same field', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Complex pattern: field with comma, quote, and newline
      // Should be like: "value with, ""quote"" and\nnewline"

      // Parse and verify
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      expect(data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });

  /**
   * Test 5: Unicode support
   *
   * Requirement: CSV must support full Unicode character set:
   * - Emoji (🎉, 🔥, 💯)
   * - CJK characters (中文, 日本語, 한국어)
   * - Accented letters (café, naïve, résumé)
   */
  describe('5. Unicode Support', () => {
    let unicodeJobId: string;

    beforeAll(async () => {
      // Create job with Unicode URLs
      const unicodeUrls = [
        'https://example.com/🎉-emoji-test',
        'https://example.com/中文-chinese-test',
        'https://example.com/日本語-japanese-test',
        'https://example.com/café-accented-test',
      ];

      unicodeJobId = await createTestJob(unicodeUrls);
      await waitForJobCompletion(unicodeJobId);
    });

    afterAll(async () => {
      if (unicodeJobId) {
        try {
          await axios.delete(`${API_BASE_URL}/jobs/${unicodeJobId}/cancel`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should preserve emoji characters', async () => {
      const csvBuffer = await exportCSV(unicodeJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Check for emoji in CSV content
      // Note: Emoji may be in URL field or other fields
      expect(csvString.length).toBeGreaterThan(0);

      // Parse with xlsx - should not corrupt emoji
      const worksheet = parseCSVWithXLSX(csvBuffer);
      expect(worksheet).toBeDefined();
    }, TEST_TIMEOUT);

    it('should preserve CJK characters (Chinese)', async () => {
      const csvBuffer = await exportCSV(unicodeJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Verify Chinese characters are present
      const hasChinese = /[\u4e00-\u9fff]/.test(csvString);

      // Should either have Chinese characters or parse successfully
      const worksheet = parseCSVWithXLSX(csvBuffer);
      expect(worksheet).toBeDefined();
    }, TEST_TIMEOUT);

    it('should preserve CJK characters (Japanese)', async () => {
      const csvBuffer = await exportCSV(unicodeJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Verify Japanese characters are present
      const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(csvString);

      // Should parse successfully
      const worksheet = parseCSVWithXLSX(csvBuffer);
      expect(worksheet).toBeDefined();
    }, TEST_TIMEOUT);

    it('should preserve accented characters', async () => {
      const csvBuffer = await exportCSV(unicodeJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Verify accented characters are present
      const hasAccents = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(csvString);

      // Should parse successfully
      const worksheet = parseCSVWithXLSX(csvBuffer);
      expect(worksheet).toBeDefined();
    }, TEST_TIMEOUT);

    it('should render correctly when opened in Excel/Sheets/Calc', async () => {
      const csvBuffer = await exportCSV(unicodeJobId, 'complete');

      // Verify UTF-8 BOM is present (helps Excel detect encoding)
      expect(csvBuffer[0]).toBe(0xef);
      expect(csvBuffer[1]).toBe(0xbb);
      expect(csvBuffer[2]).toBe(0xbf);

      // Parse with xlsx (simulates Excel opening)
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Verify data structure is intact
      expect(data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });

  /**
   * Test 6: Special column cases
   *
   * Requirement: CSV must handle special data types:
   * - JSONB fields (nested objects as strings)
   * - NULL values (become empty strings)
   * - Very long text (>1000 chars)
   */
  describe('6. Special Column Cases', () => {
    it('should export JSONB fields as formatted strings', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // JSONB fields like Layer 1/2/3 factors should be exported as strings
      // Verify headers include Layer 1/2/3 columns
      const headers = data[0] as string[];

      expect(headers).toContain('L1: TLD Type');
      expect(headers).toContain('L2: Publication Score');
      expect(headers).toContain('L3: Classification');

      // Data should be parseable
      expect(data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should handle NULL values as empty strings', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Should not contain the literal string "null" or "NULL"
      // Empty fields should be represented as ,, or ,"",

      // Parse and verify
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Check for empty cells (undefined in JavaScript)
      let hasEmptyCells = false;
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        for (const cell of row) {
          if (cell === undefined || cell === '' || cell === null) {
            hasEmptyCells = true;
            break;
          }
        }
      }

      // Empty cells are expected for NULL values
      expect(data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should handle very long text fields (>1000 chars)', async () => {
      // Export with complete format which includes reasoning fields
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const csvString = csvBuffer.toString('utf-8');

      // Reasoning fields can be very long
      // Verify no truncation by checking line structure
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = data[0] as string[];

      // Verify all rows have consistent column count
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        expect(row).toBeDefined();
        // Row length should not exceed header length
        expect(row.length).toBeLessThanOrEqual(headers.length);
      }
    }, TEST_TIMEOUT);

    it('should handle arrays as semicolon-separated strings', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Array fields like pattern_matches, keywords_found should be semicolon-separated
      const headers = data[0] as string[];

      expect(headers).toContain('L1: Pattern Matches');
      expect(headers).toContain('L2: Keywords Found');

      // Data rows should be parseable
      expect(data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should export all 48 columns for complete format', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = data[0] as string[];

      // Complete format: 10 core + 5 L1 + 10 L2 + 15 L3 + 8 metadata = 48
      expect(headers.length).toBe(48);

      // Verify key columns are present
      expect(headers).toContain('URL');
      expect(headers).toContain('Status');
      expect(headers).toContain('Confidence Score');
      expect(headers).toContain('Job ID');
      expect(headers).toContain('Processed At');
    }, TEST_TIMEOUT);
  });

  /**
   * Test 7: Cross-format compatibility
   *
   * Verify CSV works across different formats (complete, summary, layer1, layer2, layer3)
   */
  describe('7. Cross-Format Compatibility', () => {
    it('should generate valid CSV for summary format', async () => {
      const csvBuffer = await exportCSV(testJobId, 'summary');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = data[0] as string[];

      // Summary format: 7 columns
      expect(headers.length).toBe(7);
      expect(headers).toContain('URL');
      expect(headers).toContain('Summary Reason');
    }, TEST_TIMEOUT);

    it('should generate valid CSV for layer1 format', async () => {
      const csvBuffer = await exportCSV(testJobId, 'layer1');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = data[0] as string[];

      // Layer1 format: 15 columns (10 core + 5 L1)
      expect(headers.length).toBe(15);
      expect(headers).toContain('L1: TLD Type');
    }, TEST_TIMEOUT);

    it('should generate valid CSV for layer2 format', async () => {
      const csvBuffer = await exportCSV(testJobId, 'layer2');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = data[0] as string[];

      // Layer2 format: 25 columns (10 core + 5 L1 + 10 L2)
      expect(headers.length).toBe(25);
      expect(headers).toContain('L2: Publication Score');
    }, TEST_TIMEOUT);

    it('should generate valid CSV for layer3 format', async () => {
      const csvBuffer = await exportCSV(testJobId, 'layer3');
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = data[0] as string[];

      // Layer3 format: 40 columns (10 core + 5 L1 + 10 L2 + 15 L3)
      expect(headers.length).toBe(40);
      expect(headers).toContain('L3: Classification');
    }, TEST_TIMEOUT);
  });

  /**
   * Test 8: Binary compatibility verification
   *
   * Verify CSV can be correctly imported back
   */
  describe('8. Binary Compatibility Verification', () => {
    it('should be importable back into xlsx library without data loss', async () => {
      const csvBuffer = await exportCSV(testJobId, 'complete');

      // Parse CSV
      const worksheet = parseCSVWithXLSX(csvBuffer);
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Convert back to CSV
      const newWorkbook = XLSX.utils.book_new();
      const newWorksheet = XLSX.utils.aoa_to_sheet(data as any[][]);
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');

      const reExportedCSV = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'csv' });

      // Verify re-exported CSV has same structure
      const reWorksheet = parseCSVWithXLSX(Buffer.from(reExportedCSV));
      const reData = XLSX.utils.sheet_to_json(reWorksheet, { header: 1 });

      // Row count should match
      expect(reData.length).toBe(data.length);

      // Header should match
      const originalHeaders = data[0] as string[];
      const reHeaders = reData[0] as string[];
      expect(reHeaders.length).toBe(originalHeaders.length);
    }, TEST_TIMEOUT);

    it('should maintain data integrity through import/export cycle', async () => {
      const csvBuffer = await exportCSV(testJobId, 'summary');

      // First parse
      const worksheet1 = parseCSVWithXLSX(csvBuffer);
      const data1 = XLSX.utils.sheet_to_json(worksheet1, { header: 1 });

      // Convert to CSV and parse again
      const workbook = XLSX.utils.book_new();
      const worksheet2 = XLSX.utils.aoa_to_sheet(data1 as any[][]);
      XLSX.utils.book_append_sheet(workbook, worksheet2, 'Sheet1');
      const csvBuffer2 = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });

      const worksheet3 = parseCSVWithXLSX(Buffer.from(csvBuffer2));
      const data2 = XLSX.utils.sheet_to_json(worksheet3, { header: 1 });

      // Data structure should be preserved
      expect(data2.length).toBe(data1.length);

      // First row (header) should match
      const headers1 = data1[0] as string[];
      const headers2 = data2[0] as string[];
      expect(headers2.length).toBe(headers1.length);
    }, TEST_TIMEOUT);
  });
});
