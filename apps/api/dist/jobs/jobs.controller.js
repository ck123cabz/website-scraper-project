"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jobs_service_1 = require("./jobs.service");
const file_parser_service_1 = require("./services/file-parser.service");
const url_validation_service_1 = require("./services/url-validation.service");
const create_job_dto_1 = require("./dto/create-job.dto");
const path_1 = require("path");
let JobsController = class JobsController {
    constructor(jobsService, fileParserService, urlValidationService) {
        this.jobsService = jobsService;
        this.fileParserService = fileParserService;
        this.urlValidationService = urlValidationService;
    }
    async createJobWithUrls(file, body, contentType, req) {
        try {
            let urls = [];
            const jobName = body.name || 'Untitled Job';
            if (file) {
                const fileExt = (0, path_1.extname)(file.originalname).toLowerCase();
                urls = await this.fileParserService.parseFile(file.buffer, fileExt);
            }
            else if (body.urls && Array.isArray(body.urls)) {
                urls = body.urls;
            }
            else if (contentType?.includes('text/plain')) {
                const rawBody = req.rawBody || '';
                urls = rawBody
                    .split('\n')
                    .map((url) => url.trim())
                    .filter((url) => url.length > 0);
            }
            else {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Invalid request format. Expected file upload, JSON body with urls array, or text/plain body.',
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            const { validUrls, invalidCount } = this.urlValidationService.validateAndNormalizeUrls(urls);
            if (validUrls.length === 0) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'No valid URLs found in uploaded file',
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            const originalCount = validUrls.length;
            const deduplicationMap = new Map();
            for (const url of validUrls) {
                const normalizedKey = this.urlValidationService.normalizeForDeduplication(url);
                if (!deduplicationMap.has(normalizedKey)) {
                    deduplicationMap.set(normalizedKey, url);
                }
            }
            const uniqueUrls = Array.from(deduplicationMap.values());
            const duplicatesRemovedCount = originalCount - uniqueUrls.length;
            const job = await this.jobsService.createJobWithUrls(jobName, uniqueUrls);
            return {
                success: true,
                data: {
                    job_id: job.id,
                    url_count: uniqueUrls.length,
                    duplicates_removed_count: duplicatesRemovedCount,
                    invalid_urls_count: invalidCount,
                    created_at: job.created_at,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            console.error('[JobsController] Error creating job with URLs:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to process upload. Please try again or contact support.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createJob(body) {
        try {
            const job = await this.jobsService.createJob(body);
            return {
                success: true,
                data: job,
            };
        }
        catch (error) {
            console.error('[JobsController] Error creating job:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to create job. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getJob(id) {
        try {
            const job = await this.jobsService.getJobById(id);
            if (!job) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Job not found',
                }, common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                data: job,
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            console.error('[JobsController] Error fetching job:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to retrieve job. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getAllJobs() {
        try {
            const jobs = await this.jobsService.getAllJobs();
            return {
                success: true,
                data: jobs,
            };
        }
        catch (error) {
            console.error('[JobsController] Error fetching jobs:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to retrieve jobs. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('content-type')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_job_dto_1.CreateJobDto, String, Object]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "createJobWithUrls", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getJob", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getAllJobs", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService,
        file_parser_service_1.FileParserService,
        url_validation_service_1.UrlValidationService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map