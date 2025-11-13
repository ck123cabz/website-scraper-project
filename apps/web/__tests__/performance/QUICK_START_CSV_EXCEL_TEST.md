# Quick Start: CSV Excel Compatibility Test

## Run the Test (3 Steps)

### 1. Start API Server
```bash
cd apps/api
npm run dev
```

### 2. Run Test
```bash
cd apps/web
npm test -- csv-excel-compat.perf.spec.ts
```

### 3. Verify Results
Expected output:
```
PASS  __tests__/performance/csv-excel-compat.perf.spec.ts
  ✓ 32 tests passed
```

## What This Test Does

Tests CSV exports for Excel compatibility:

- ✅ **UTF-8 BOM** - Excel detects encoding automatically
- ✅ **CRLF Line Endings** - Windows standard (`\r\n`)
- ✅ **RFC 4180 Escaping** - Commas, quotes, newlines handled correctly
- ✅ **Unicode Support** - Emoji, Chinese, Japanese, accented letters
- ✅ **Special Cases** - JSONB, NULL, long text, arrays
- ✅ **All Formats** - Complete, summary, layer1, layer2, layer3
- ✅ **Round-Trip** - Import/export maintains data integrity

## Test Structure

```
8 test suites
32 individual tests
~703 lines of code
Uses xlsx library (same engine as Excel)
```

## Files Created

1. **Test File**: `csv-excel-compat.perf.spec.ts` (703 lines)
2. **Documentation**: `README_CSV_EXCEL_COMPAT.md` (detailed guide)
3. **Summary**: `/T122B_IMPLEMENTATION_SUMMARY.md` (implementation notes)

## Manual Verification

```bash
# Export CSV
curl -X POST "http://localhost:3001/jobs/{jobId}/export?format=complete" -o test.csv

# Open in Excel and verify:
# - All columns appear correctly
# - Unicode characters display properly
# - Special characters don't break columns
```

## Troubleshooting

**API Connection Error?**
```bash
cd apps/api && npm run dev
```

**Test Timeout?**
- Check database connection
- Verify jobs are processing
- Increase TEST_TIMEOUT in test file

**XLSX Parsing Error?**
- Check UTF-8 BOM is present
- Verify CRLF line endings
- Ensure valid CSV format

## Success Criteria

✅ SC-008: Excel/Sheets/Calc compatible
- CSV parses correctly in Excel
- UTF-8 BOM enables proper encoding
- CRLF line endings (Windows standard)
- RFC 4180 compliant escaping
- Full Unicode support
- All export formats work
- Data integrity maintained

## Dependencies

- `xlsx@^0.18.5` - Excel parsing library (installed)
- `axios@^1.12.2` - API calls (already installed)

## Task Info

- **Task ID**: T122b
- **Success Criterion**: SC-008
- **Phase**: 5 (CSV Export)
- **Status**: ✅ Complete

For detailed documentation, see `README_CSV_EXCEL_COMPAT.md`
