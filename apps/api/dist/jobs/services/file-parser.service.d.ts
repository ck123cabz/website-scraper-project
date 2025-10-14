export declare class FileParserService {
    parseFile(filePath: string, fileType: string): Promise<string[]>;
    private parseCsv;
    private extractUrlsFromHeaderedCsv;
    private extractUrlsFromSimpleCsv;
    private parseTxt;
    private looksLikeUrl;
}
