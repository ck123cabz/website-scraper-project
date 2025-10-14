"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileParserService = void 0;
const common_1 = require("@nestjs/common");
const Papa = __importStar(require("papaparse"));
const fs = __importStar(require("fs"));
let FileParserService = class FileParserService {
    async parseFile(filePath, fileType) {
        if (fileType === '.csv') {
            return this.parseCsv(filePath);
        }
        else if (fileType === '.txt') {
            return this.parseTxt(filePath);
        }
        else {
            throw new Error(`Unsupported file type: ${fileType}`);
        }
    }
    async parseCsv(filePath) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return new Promise((resolve, reject) => {
            Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        let urls = [];
                        if (results.meta.fields && results.meta.fields.length > 0) {
                            urls = this.extractUrlsFromHeaderedCsv(results.data, results.meta.fields);
                        }
                        else {
                            urls = this.extractUrlsFromSimpleCsv(fileContent);
                        }
                        resolve(urls);
                    }
                    catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(new Error(`CSV parsing error: ${error.message}`));
                },
            });
        });
    }
    extractUrlsFromHeaderedCsv(data, fields) {
        const urlColumnPatterns = ['url', 'link', 'website', 'site', 'href', 'web'];
        let urlColumn = null;
        for (const field of fields) {
            const lowerField = field.toLowerCase();
            if (urlColumnPatterns.some((pattern) => lowerField.includes(pattern))) {
                urlColumn = field;
                break;
            }
        }
        if (!urlColumn) {
            for (const field of fields) {
                const sampleValues = data.slice(0, 10).map((row) => row[field]);
                const validUrlCount = sampleValues.filter((val) => this.looksLikeUrl(val)).length;
                if (validUrlCount > sampleValues.length / 2) {
                    urlColumn = field;
                    break;
                }
            }
        }
        if (!urlColumn) {
            throw new Error('Could not auto-detect URL column in CSV file');
        }
        return data
            .map((row) => (typeof row[urlColumn] === 'string' ? row[urlColumn].trim() : ''))
            .filter((url) => url.length > 0);
    }
    extractUrlsFromSimpleCsv(fileContent) {
        const lines = fileContent.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
        return lines.map((line) => {
            const parts = line.split(',');
            return parts[0].trim();
        }).filter((url) => url.length > 0);
    }
    async parseTxt(filePath) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
    }
    looksLikeUrl(value) {
        if (typeof value !== 'string')
            return false;
        const urlPattern = /^https?:\/\//i;
        return urlPattern.test(value.trim());
    }
};
exports.FileParserService = FileParserService;
exports.FileParserService = FileParserService = __decorate([
    (0, common_1.Injectable)()
], FileParserService);
//# sourceMappingURL=file-parser.service.js.map