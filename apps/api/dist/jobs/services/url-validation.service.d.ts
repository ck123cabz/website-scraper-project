export declare class UrlValidationService {
    private readonly URL_PATTERN;
    validateAndNormalizeUrls(urls: string[]): {
        validUrls: string[];
        invalidCount: number;
    };
    isValidUrl(url: string): boolean;
    normalizeUrl(url: string): string;
    normalizeForDeduplication(url: string): string;
}
