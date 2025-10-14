"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlValidationService = void 0;
const common_1 = require("@nestjs/common");
let UrlValidationService = class UrlValidationService {
    constructor() {
        this.URL_PATTERN = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    }
    validateAndNormalizeUrls(urls) {
        let invalidCount = 0;
        const validUrls = [];
        for (const url of urls) {
            const trimmed = url.trim();
            if (trimmed.length === 0) {
                continue;
            }
            if (this.isValidUrl(trimmed)) {
                const normalized = this.normalizeUrl(trimmed);
                validUrls.push(normalized);
            }
            else {
                invalidCount++;
            }
        }
        return { validUrls, invalidCount };
    }
    isValidUrl(url) {
        return this.URL_PATTERN.test(url);
    }
    normalizeUrl(url) {
        let normalized = url.trim();
        try {
            const urlObj = new URL(normalized);
            urlObj.protocol = urlObj.protocol.toLowerCase();
            urlObj.hostname = urlObj.hostname.toLowerCase();
            if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
                urlObj.pathname = urlObj.pathname.slice(0, -1);
            }
            return urlObj.toString();
        }
        catch (error) {
            return normalized;
        }
    }
    normalizeForDeduplication(url) {
        try {
            const urlObj = new URL(url);
            urlObj.protocol = 'https:';
            urlObj.hostname = urlObj.hostname.replace(/^www\./, '');
            urlObj.hostname = urlObj.hostname.toLowerCase();
            if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
                urlObj.pathname = urlObj.pathname.slice(0, -1);
            }
            if (urlObj.search) {
                const params = new URLSearchParams(urlObj.search);
                const sortedParams = new URLSearchParams(Array.from(params.entries()).sort());
                urlObj.search = sortedParams.toString();
            }
            return urlObj.toString();
        }
        catch (error) {
            return url;
        }
    }
};
exports.UrlValidationService = UrlValidationService;
exports.UrlValidationService = UrlValidationService = __decorate([
    (0, common_1.Injectable)()
], UrlValidationService);
//# sourceMappingURL=url-validation.service.js.map