import { Injectable } from '@nestjs/common';
import * as Papa from 'papaparse';
import * as fs from 'fs';

@Injectable()
export class FileParserService {
  /**
   * Parse a CSV or TXT file and extract URLs
   * @param filePath Path to the uploaded file
   * @param fileType File extension (.csv or .txt)
   * @returns Array of URLs extracted from the file
   */
  async parseFile(filePath: string, fileType: string): Promise<string[]> {
    if (fileType === '.csv') {
      return this.parseCsv(filePath);
    } else if (fileType === '.txt') {
      return this.parseTxt(filePath);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Parse CSV file with auto-detection of URL column
   * Handles: single column, multi-column, headers/no headers
   */
  private async parseCsv(filePath: string): Promise<string[]> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

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

            resolve(urls);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
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

    // If still no URL column found, throw error
    if (!urlColumn) {
      throw new Error('Could not auto-detect URL column in CSV file');
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
  private async parseTxt(filePath: string): Promise<string[]> {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

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
