export declare class FileParserService {
    parseFile(fileBuffer: Buffer, fileType: string): Promise<string[]>;
    private parseCsv;
    private extractUrlsFromHeaderedCsv;
    private extractUrlsFromSimpleCsv;
    private parseTxt;
    private looksLikeUrl;
}
