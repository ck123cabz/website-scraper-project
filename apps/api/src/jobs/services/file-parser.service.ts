import { Injectable } from '@nestjs/common';
import * as Papa from 'papaparse';

@Injectable()
export class FileParserService {
  /**
   * Parse a CSV or TXT file and extract URLs
   * @param fileBuffer File buffer from memory storage
   * @param fileType File extension (.csv or .txt)
   * @returns Array of URLs extracted from the file
   */
  async parseFile(fileBuffer: Buffer, fileType: string): Promise<string[]> {
    // L1 Fix: More specific error messages for better UX
    if (fileBuffer.length === 0) {
      throw new Error('Empty file uploaded. Please upload a file with valid URLs.');
    }

    if (fileType === '.csv') {
      return this.parseCsv(fileBuffer);
    } else if (fileType === '.txt') {
      return this.parseTxt(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}. Only .csv and .txt files are allowed.`);
    }
  }

  /**
   * Parse CSV file with auto-detection of URL column
   * Handles: single column, multi-column, headers/no headers
   */
  private async parseCsv(fileBuffer: Buffer): Promise<string[]> {
    const fileContent = fileBuffer.toString('utf-8');

    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true, // Try parsing with headers first
        skipEmptyLines: true,
        complete: (results) => {
          try {
            let urls: string[] = [];

            // Check if headers were detected
            if (results.meta.fields && results.meta.fields.length > 0) {
              // Multi-column CSV with headers
              urls = this.extractUrlsFromHeaderedCsv(results.data, results.meta.fields);
            } else {
              // No headers detected, try parsing as simple CSV
              urls = this.extractUrlsFromSimpleCsv(fileContent);
            }

            // L1 Fix: Specific error if no URLs found after parsing
            if (urls.length === 0) {
              reject(new Error('Empty CSV file or no valid data found. Please ensure your CSV contains URLs.'));
            }

            resolve(urls);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          // L1 Fix: More specific CSV parsing error
          reject(new Error(`Malformed CSV file: ${error.message}. Please check your file format.`));
        },
      });
    });
  }

  /**
   * Extract URLs from CSV with headers by auto-detecting the URL column
   */
  private extractUrlsFromHeaderedCsv(data: any[], fields: string[]): string[] {
    // Strategy 1: Find column with name containing 'url', 'link', 'website', etc.
    const urlColumnPatterns = ['url', 'link', 'website', 'site', 'href', 'web'];
    let urlColumn: string | null = null;

    for (const field of fields) {
      const lowerField = field.toLowerCase();
      if (urlColumnPatterns.some((pattern) => lowerField.includes(pattern))) {
        urlColumn = field;
        break;
      }
    }

    // Strategy 2: If no URL column found by name, find the first column with valid URLs
    if (!urlColumn) {
      for (const field of fields) {
        const sampleValues = data.slice(0, 10).map((row) => row[field]);
        const validUrlCount = sampleValues.filter((val) => this.looksLikeUrl(val)).length;

        // If more than 50% of sample values look like URLs, use this column
        if (validUrlCount > sampleValues.length / 2) {
          urlColumn = field;
          break;
        }
      }
    }

    // L1 Fix: More specific error message when URL column not found
    if (!urlColumn) {
      throw new Error(
        'Could not auto-detect URL column in CSV file. Please ensure your CSV has a column named "url", "link", or "website", or that URLs are in the first column.',
      );
    }

    // Extract URLs from the detected column
    return data
      .map((row) => (typeof row[urlColumn!] === 'string' ? row[urlColumn!].trim() : ''))
      .filter((url) => url.length > 0);
  }

  /**
   * Extract URLs from simple CSV (no headers, single column)
   */
  private extractUrlsFromSimpleCsv(fileContent: string): string[] {
    // Parse without headers
    const lines = fileContent.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

    // For single-column CSV, just take the first value from each line
    return lines.map((line) => {
      const parts = line.split(',');
      return parts[0].trim();
    }).filter((url) => url.length > 0);
  }

  /**
   * Parse TXT file (line-by-line)
   */
  private async parseTxt(fileBuffer: Buffer): Promise<string[]> {
    const fileContent = fileBuffer.toString('utf-8');

    return fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Simple heuristic to check if a string looks like a URL
   */
  private looksLikeUrl(value: any): boolean {
    if (typeof value !== 'string') return false;

    const urlPattern = /^https?:\/\//i;
    return urlPattern.test(value.trim());
  }
}
