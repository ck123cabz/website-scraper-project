# T066: Manual Excel Compatibility Testing Guide

**Purpose**: Instructions for manually testing CSV exports in Microsoft Excel, Google Sheets, and LibreOffice Calc to verify real-world compatibility.

---

## Prerequisites

- ExportService endpoint implemented (T067 complete)
- Access to at least one of:
  - Microsoft Excel (2016+ recommended)
  - Google Sheets
  - LibreOffice Calc
- Job with completed URL results to export

---

## Test Procedure

### Step 1: Generate Test CSV Files

Export CSV files for each format using the API or UI:

```bash
# Example API calls (adjust jobId)
JOB_ID="your-job-id-here"

# Complete format (48 columns)
curl -o complete.csv "http://localhost:3001/jobs/${JOB_ID}/export?format=complete"

# Summary format (7 columns)
curl -o summary.csv "http://localhost:3001/jobs/${JOB_ID}/export?format=summary"

# Layer1 format (15 columns)
curl -o layer1.csv "http://localhost:3001/jobs/${JOB_ID}/export?format=layer1"

# Layer2 format (25 columns)
curl -o layer2.csv "http://localhost:3001/jobs/${JOB_ID}/export?format=layer2"

# Layer3 format (40 columns)
curl -o layer3.csv "http://localhost:3001/jobs/${JOB_ID}/export?format=layer3"
```

### Step 2: Create Test Data CSV

Create a test CSV file with special characters to verify escaping:

**File: `test-special-chars.csv`**
```csv
URL,Status,Notes
"https://example.com/path?query=1&other=2",approved,"Contains comma, and quotes"""
"https://example.org/test",rejected,"Line break:
Next line here"
"https://test.com",approved,"Unicode: café, naïve, emoji 🚀"
"https://site.com",pending,"Complex: ""quoted"", comma, and
newline"
```

---

## Test 1: Microsoft Excel

### Opening the File

1. **Open Excel**
2. **File → Open** (or double-click CSV file)
3. **Expected**: File opens immediately without import wizard

### Verification Checklist

#### ✅ BOM Detection
- [ ] File opens in Excel without "import wizard"
- [ ] No � or weird characters at start of first column header
- [ ] Column headers display correctly in first row
- [ ] **If import wizard appears**: BOM may be missing

#### ✅ Character Encoding
- [ ] Unicode characters display correctly:
  - café → should show é with accent
  - naïve → should show ï with diaeresis
  - 🚀 → emoji displays (Excel 2016+)
- [ ] No boxes (□) or question marks (?) for special characters
- [ ] Accented characters in URLs preserved

#### ✅ CSV Escaping (RFC 4180)
- [ ] **Commas in fields**: Cell contains comma, not split across columns
  - "Contains comma, and quotes" → single cell
  - URL with query params → single cell
- [ ] **Quotes in fields**: Display correctly without extra quotes
  - 'say "hello"' → shows as: say "hello"
  - Not: say ""hello""
- [ ] **Newlines in fields**:
  - Multi-line text stays in one cell
  - Alt+Enter equivalent works to navigate multi-line cells
  - Not split across rows

#### ✅ Line Endings
- [ ] Each row is a separate Excel row
- [ ] No blank rows between data rows
- [ ] Last row doesn't have extra blank row after it

#### ✅ Column Headers
- [ ] First row is headers (frozen or distinct formatting not required)
- [ ] All expected columns present:
  - Complete format: 48 columns
  - Summary format: 7 columns
  - Layer1 format: 15 columns
  - Layer2 format: 25 columns
  - Layer3 format: 40 columns
- [ ] No truncated or merged headers

#### ✅ Data Types
- [ ] **Numbers**: Display as numbers, not in scientific notation
  - 0.05 → shows as 0.05 (not 5.00E-02)
  - 1500 → shows as 1500 (not 1.5E+3)
- [ ] **Booleans**: Display as text "true" or "false"
  - Not converted to TRUE/FALSE formulas
- [ ] **Dates**: ISO 8601 format preserved
  - "2025-01-13T10:00:00.000Z" → shows as text (not auto-converted to date)
- [ ] **Empty cells**: Show as blank, not "NULL" or "undefined"

#### ✅ Array Fields
- [ ] Semicolon-separated arrays readable
  - "tech-company; enterprise" → shows in one cell
  - Can be split manually if needed: Data → Text to Columns → Delimiter: semicolon

#### ✅ Performance
- [ ] Large files (10k+ rows) open quickly (< 5 seconds)
- [ ] No memory warnings or crashes
- [ ] Scrolling is smooth

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| � at start of file | BOM as character | Verify BOM is 0xEF 0xBB 0xBF (not visible character) |
| Commas split columns | Missing quotes | Check escapeCSVField() wraps in quotes |
| Multi-line text in separate rows | Missing quotes | Check escapeCSVField() wraps newlines |
| Extra blank rows | Wrong line ending (LF vs CRLF) | Verify all rows use \r\n |
| Numbers in scientific notation | Large numbers | Use .toString() on all numbers |
| Weird characters | Wrong encoding | Verify UTF-8 BOM present |

---

## Test 2: Google Sheets

### Opening the File

1. **Open Google Sheets**
2. **File → Import**
3. **Upload tab** → Select CSV file
4. **Import location**: "Replace current sheet"
5. **Separator type**: Detect automatically
6. **Convert text to numbers, dates**: NO (uncheck)
7. **Click "Import data"**

### Verification Checklist

#### ✅ Import Settings Detected
- [ ] Google Sheets auto-detects comma separator
- [ ] No manual delimiter selection needed
- [ ] UTF-8 encoding auto-detected

#### ✅ Character Encoding
- [ ] Unicode characters display correctly
- [ ] Emojis render (if supported)
- [ ] No encoding errors

#### ✅ CSV Escaping
- [ ] Commas in fields: Single cell
- [ ] Quotes in fields: Display correctly
- [ ] Newlines in fields: Stay in one cell (use Ctrl+Enter to view)

#### ✅ Column Headers
- [ ] First row recognized as headers
- [ ] All columns present and labeled

#### ✅ Data Types
- [ ] Numbers preserved as strings (no auto-conversion)
- [ ] Dates stay as ISO 8601 strings
- [ ] Booleans as text "true"/"false"

#### ✅ Performance
- [ ] Import completes quickly
- [ ] Spreadsheet responsive with 10k+ rows

### Google Sheets Notes

- **BOM**: Google Sheets handles BOM well but it's optional
- **Character encoding**: Google Sheets is more lenient than Excel
- **Auto-conversion**: Disable "Convert text to numbers, dates" during import

---

## Test 3: LibreOffice Calc

### Opening the File

1. **Open LibreOffice Calc**
2. **File → Open** → Select CSV file
3. **Text Import dialog appears**:
   - **Character set**: Unicode (UTF-8) ← Should auto-detect
   - **Separator Options**: Check "Comma" only
   - **String delimiter**: " (double quote)
   - **Quoted field as text**: ENABLED
   - **Detect special numbers**: DISABLED
4. **Click OK**

### Verification Checklist

#### ✅ Import Dialog
- [ ] Character set auto-detected as UTF-8
- [ ] BOM doesn't appear as visible character in preview
- [ ] Preview shows correct column splits

#### ✅ Character Encoding
- [ ] Unicode characters display correctly
- [ ] Emojis display (LibreOffice 6+)

#### ✅ CSV Escaping
- [ ] Commas in fields: Single cell
- [ ] Quotes in fields: Display correctly
- [ ] Newlines in fields: Stay in one cell

#### ✅ Column Headers
- [ ] First row is headers
- [ ] All columns present

#### ✅ Data Types
- [ ] Numbers as text (no scientific notation if "Detect special numbers" disabled)
- [ ] Dates as text
- [ ] Booleans as text

### LibreOffice Notes

- **BOM**: Crucial for auto-detecting UTF-8
- **Import dialog**: Always appears for CSV files
- **Special numbers**: Disable to prevent auto-conversion

---

## Test 4: Cross-Application Compatibility

### Save and Re-open Test

1. **Open CSV in Excel** → Make no changes → Save
2. **Re-open in Google Sheets** → Verify data intact
3. **Re-open in LibreOffice** → Verify data intact

**Expected**: All data preserved across save/open cycles

### Round-Trip Test

1. **Export from system** → `original.csv`
2. **Open in Excel** → Save as `excel-saved.csv`
3. **Diff the files**: `diff original.csv excel-saved.csv`

**Expected**: Only differences should be Excel's re-formatting (acceptable)

---

## Test 5: Edge Cases

Create a CSV with edge case data:

### Edge Case Test Data

```csv
URL,Value,Notes
"http://test.com","123456789012345678901234","Very large number"
"http://test.com","0.00000000001","Very small decimal"
"http://test.com","","Empty field"
"http://test.com",,"Null field"
"http://test.com","Multi
line
field","Three line breaks"
"http://test.com","Quote ""nested"" quote","Nested quotes"
"http://test.com","Café résumé naïve 日本語 🚀","All Unicode types"
"http://test.com","Line1
Line2","Tab	and	commas,here"
```

### Edge Case Verification

- [ ] Very large numbers: No scientific notation
- [ ] Very small decimals: Preserved
- [ ] Empty strings: Display as blank
- [ ] Null values: Display as blank
- [ ] Multi-line fields: Stay in single cell
- [ ] Nested quotes: Display with single quotes
- [ ] Unicode mix: All characters preserved
- [ ] Tabs: Preserved (not converted to delimiters)

---

## Test 6: Real-World Scenario

### Production-Scale Test

1. **Create large job**: 1000+ URLs
2. **Export complete format**: 48 columns
3. **Open in Excel**
4. **Perform analysis**:
   - Sort by confidence score
   - Filter by status
   - Create pivot table
   - Calculate statistics

**Expected**:
- Opens quickly (< 5 seconds)
- Sorting works correctly
- Filtering works correctly
- Pivot tables work
- Formulas reference data correctly

---

## Test Results Template

### Test Report: [Date]

**Tester**: [Name]
**System**: [OS and Application versions]

#### Excel 2016+ (or version)
- [ ] BOM detected correctly
- [ ] Unicode characters displayed
- [ ] CSV escaping works
- [ ] Line endings correct
- [ ] Column headers present
- [ ] Data types preserved
- [ ] Performance acceptable
- [ ] Issues found: [List or None]

#### Google Sheets
- [ ] Import successful
- [ ] Character encoding correct
- [ ] CSV escaping works
- [ ] Data types preserved
- [ ] Performance acceptable
- [ ] Issues found: [List or None]

#### LibreOffice Calc (version)
- [ ] Import dialog correct
- [ ] UTF-8 auto-detected
- [ ] CSV escaping works
- [ ] Data types preserved
- [ ] Performance acceptable
- [ ] Issues found: [List or None]

#### Cross-Application
- [ ] Save/re-open works
- [ ] Round-trip preserves data
- [ ] Issues found: [List or None]

#### Edge Cases
- [ ] Large numbers work
- [ ] Small decimals work
- [ ] Empty/null fields work
- [ ] Multi-line fields work
- [ ] Nested quotes work
- [ ] Unicode mix works
- [ ] Issues found: [List or None]

#### Production Scale
- [ ] 1000+ row export works
- [ ] Opens quickly
- [ ] Sorting works
- [ ] Filtering works
- [ ] Pivot tables work
- [ ] Issues found: [List or None]

### Overall Status
- [ ] **PASS**: All requirements met
- [ ] **PASS with notes**: Minor issues, acceptable
- [ ] **FAIL**: Critical issues found

### Notes
[Any additional observations or recommendations]

---

## Troubleshooting Guide

### Issue: BOM Shows as Character
**Symptom**: � or weird character at start of first cell
**Cause**: BOM treated as visible character instead of encoding marker
**Fix**: Verify UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf])

### Issue: Commas Split Columns
**Symptom**: "Hello, World" appears in two columns
**Cause**: Field not wrapped in quotes
**Fix**: Check escapeCSVField() wraps fields with commas

### Issue: Multi-line Fields Split Rows
**Symptom**: "Line1\nLine2" creates two rows
**Cause**: Field not wrapped in quotes
**Fix**: Check escapeCSVField() wraps fields with newlines

### Issue: Quotes Display Wrong
**Symptom**: Say ""Hello"" instead of Say "Hello"
**Cause**: Quotes not doubled correctly
**Fix**: Check replace(/"/g, '""') in escapeCSVField()

### Issue: Wrong Line Endings
**Symptom**: Extra blank rows or all data in one row
**Cause**: Using \n instead of \r\n
**Fix**: Verify all stream.push() calls use '\r\n'

### Issue: Unicode Broken
**Symptom**: Boxes □ or ? for special characters
**Cause**: Missing BOM or wrong encoding
**Fix**: Ensure UTF-8 BOM is first bytes in stream

### Issue: Scientific Notation
**Symptom**: 0.05 shows as 5.00E-02
**Cause**: Excel auto-converting numbers
**Fix**: Numbers already as strings with .toString()

---

## Conclusion

After completing manual testing:

1. ✅ Document results in Test Report
2. ✅ File issues for any failures
3. ✅ Update T066 verification report with real-world test results
4. ✅ Approve for production if all tests pass

**Sign-off**: [Name] - [Date]

---

**File Location**: `/docs/T066-MANUAL-EXCEL-TEST-GUIDE.md`
**Related**:
- `/docs/T066-EXCEL-COMPATIBILITY-VERIFICATION-REPORT.md` - Automated test report
- `/apps/api/src/jobs/services/export.service.ts` - Implementation
- `/apps/api/src/jobs/services/__tests__/export.service.spec.ts` - Unit tests
