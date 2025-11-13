# CSV Excel Compatibility Test (T122b)

## Overview

This test suite verifies that CSV exports from the website scraper are fully compatible with Microsoft Excel, Google Sheets, and LibreOffice Calc.

**Test File**: `csv-excel-compat.perf.spec.ts`
**Success Criterion**: SC-008 (Excel/Sheets/Calc compatible)
**Task**: T122b (CSV Excel Compatibility Test)

## Test Requirements

The test suite validates the following requirements:

### 1. Excel-Compatible CSV Generation
- CSV exports must parse correctly in Excel with special characters
- Commas, quotes, and newlines in field values must not break column structure
- All data must be preserved without truncation

### 2. UTF-8 BOM Presence
- CSV files must start with UTF-8 BOM (0xEF, 0xBB, 0xBF)
- This helps Excel automatically detect UTF-8 encoding
- Without BOM, Excel may misinterpret Unicode characters

### 3. CRLF Line Endings
- All lines must end with `\r\n` (Windows standard)
- Excel expects CRLF, not just LF (Unix standard)
- Line endings must be consistent throughout the file

### 4. RFC 4180 CSV Escaping
- **Commas**: Fields containing commas must be wrapped in quotes
- **Quotes**: Double quotes must be escaped by doubling them (`""`)
- **Newlines**: Fields containing newlines must be wrapped in quotes
- All escaping must follow RFC 4180 standard

### 5. Unicode Support
- **Emoji**: Must preserve emoji characters (🎉, 🔥, 💯)
- **CJK Characters**: Must support Chinese (中文), Japanese (日本語), Korean (한국어)
- **Accented Letters**: Must support European characters (café, naïve, résumé)

### 6. Special Column Cases
- **JSONB Fields**: Nested objects must be exported as formatted strings
- **NULL Values**: NULL values must export as empty strings (not "null")
- **Long Text**: Fields with >1000 characters must export without truncation
- **Arrays**: Arrays must export as semicolon-separated strings

## Dependencies

This test requires the following packages:

```json
{
  "xlsx": "^0.18.5",  // For parsing and validating CSV files
  "axios": "^1.12.2"  // For API calls
}
```

## Running the Tests

### Run All Performance Tests
```bash
cd apps/web
npm test -- __tests__/performance
```

### Run Only CSV Excel Compatibility Tests
```bash
cd apps/web
npm test -- csv-excel-compat.perf.spec.ts
```

### Run with Verbose Output
```bash
cd apps/web
npm test -- csv-excel-compat.perf.spec.ts --verbose
```

### Run Specific Test Suite
```bash
cd apps/web
npm test -- csv-excel-compat.perf.spec.ts -t "UTF-8 BOM Presence"
```

## Prerequisites

Before running these tests, ensure:

1. **API Server is Running**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Environment Variables are Set**
   ```bash
   export API_BASE_URL=http://localhost:3001
   ```

3. **Database is Accessible**
   - Supabase must be running and accessible
   - Test data can be created dynamically

## Test Structure

### Test Suites

1. **Excel-Compatible CSV Generation** (6 tests)
   - Basic parsing with xlsx library
   - Comma handling in field values
   - Quote preservation and escaping
   - Newline handling in fields

2. **UTF-8 BOM Presence** (3 tests)
   - BOM bytes verification (0xEF, 0xBB, 0xBF)
   - UTF-8 encoding validation
   - BOM position verification

3. **CRLF Line Endings** (3 tests)
   - CRLF usage throughout file
   - No standalone LF endings
   - CRLF after header row

4. **RFC 4180 CSV Escaping** (4 tests)
   - Comma escaping by quoting
   - Quote escaping by doubling
   - Newline escaping by quoting
   - Multiple special characters in same field

5. **Unicode Support** (5 tests)
   - Emoji character preservation
   - CJK characters (Chinese, Japanese)
   - Accented letter support
   - Excel rendering compatibility

6. **Special Column Cases** (5 tests)
   - JSONB field export
   - NULL value handling
   - Very long text fields (>1000 chars)
   - Array fields as semicolon-separated
   - Complete format column count (48 columns)

7. **Cross-Format Compatibility** (4 tests)
   - Summary format (7 columns)
   - Layer1 format (15 columns)
   - Layer2 format (25 columns)
   - Layer3 format (40 columns)

8. **Binary Compatibility Verification** (2 tests)
   - Round-trip import/export without data loss
   - Data integrity through multiple cycles

## Expected Test Results

All tests should pass with the following outcomes:

- ✅ CSV files parse correctly with xlsx library
- ✅ UTF-8 BOM present at file start
- ✅ All lines end with CRLF (`\r\n`)
- ✅ RFC 4180 escaping rules followed
- ✅ Unicode characters preserved correctly
- ✅ Special data types handled properly
- ✅ All export formats generate valid CSV
- ✅ Round-trip import/export maintains integrity

## Troubleshooting

### Common Issues

#### 1. API Connection Errors
```
Error: connect ECONNREFUSED localhost:3001
```
**Solution**: Ensure API server is running on port 3001

#### 2. Test Timeout
```
Error: Timeout - Async callback was not invoked within the 30000 ms timeout
```
**Solution**:
- Check if jobs are processing correctly
- Increase TEST_TIMEOUT value in test file
- Verify database connectivity

#### 3. XLSX Parsing Errors
```
Error: Cannot read property 'Sheets' of undefined
```
**Solution**:
- Verify CSV export is generating valid data
- Check UTF-8 BOM is present
- Ensure CRLF line endings are used

#### 4. Unicode Character Issues
```
Expected Unicode characters not found in CSV
```
**Solution**:
- Verify UTF-8 BOM is present (helps Excel detect encoding)
- Check that CSV is not being transcoded during export
- Ensure test URLs contain actual Unicode characters

## Manual Verification

While the automated tests use the xlsx library to verify compatibility, you can also manually test by:

### 1. Export CSV from Application
```bash
curl -X POST "http://localhost:3001/jobs/{jobId}/export?format=complete" \
  -o test-export.csv
```

### 2. Open in Microsoft Excel
- Open Excel
- File → Open → Select `test-export.csv`
- Verify:
  - All columns appear correctly
  - Unicode characters display properly
  - Special characters (commas, quotes) don't break columns
  - Line breaks appear within cells (not as new rows)

### 3. Open in Google Sheets
- Go to Google Sheets
- File → Import → Upload `test-export.csv`
- Verify same criteria as Excel

### 4. Open in LibreOffice Calc
- Open LibreOffice Calc
- File → Open → Select `test-export.csv`
- In import dialog, verify UTF-8 encoding is detected
- Verify same criteria as Excel

## Integration with CI/CD

This test suite can be integrated into CI/CD pipelines:

### GitHub Actions Example
```yaml
- name: Run CSV Excel Compatibility Tests
  run: |
    cd apps/web
    npm test -- csv-excel-compat.perf.spec.ts --ci
  env:
    API_BASE_URL: http://localhost:3001
```

### Test Coverage

The test suite provides comprehensive coverage of:
- ✅ CSV structure and formatting
- ✅ Character encoding (UTF-8 with BOM)
- ✅ Line ending standards (CRLF)
- ✅ Escaping rules (RFC 4180)
- ✅ Unicode support (emoji, CJK, accents)
- ✅ Edge cases (NULL, JSONB, long text)
- ✅ Multiple export formats
- ✅ Data integrity verification

## Related Documentation

- **ExportService**: `/apps/api/src/jobs/services/export.service.ts`
- **Export Tests**: `/apps/api/src/jobs/__tests__/export.service-*.spec.ts`
- **RFC 4180 Standard**: https://datatracker.ietf.org/doc/html/rfc4180
- **UTF-8 BOM**: https://en.wikipedia.org/wiki/Byte_order_mark
- **XLSX Library**: https://github.com/SheetJS/sheetjs

## Success Criteria

The test suite passes when:

1. All 37+ test cases pass
2. CSV exports parse correctly with xlsx library
3. No data loss or corruption occurs
4. Special characters are handled properly
5. Unicode support is verified
6. All export formats work correctly
7. Round-trip import/export maintains data integrity

## Maintenance Notes

- Update test URLs if domain validation rules change
- Add new test cases for additional export formats
- Keep xlsx library up to date for latest compatibility
- Monitor Excel/Sheets/Calc updates for breaking changes
- Add tests for any new special characters or data types
