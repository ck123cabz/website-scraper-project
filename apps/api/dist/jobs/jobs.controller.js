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
const queue_service_1 = require("../queue/queue.service");
const supabase_service_1 = require("../supabase/supabase.service");
const export_service_1 = require("./services/export.service");
const create_job_dto_1 = require("./dto/create-job.dto");
const path_1 = require("path");
let JobsController = class JobsController {
    constructor(jobsService, fileParserService, urlValidationService, queueService, supabase, exportService) {
        this.jobsService = jobsService;
        this.fileParserService = fileParserService;
        this.urlValidationService = urlValidationService;
        this.queueService = queueService;
        this.supabase = supabase;
        this.exportService = exportService;
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
            const { job, urlIds } = await this.jobsService.createJobWithUrls(jobName, uniqueUrls);
            await this.jobsService.updateJob(job.id, {
                status: 'processing',
                started_at: new Date().toISOString(),
            });
            const queueJobs = uniqueUrls.map((url, index) => ({
                jobId: job.id,
                url,
                urlId: urlIds[index],
            }));
            await this.queueService.addUrlsToQueue(queueJobs);
            return {
                success: true,
                data: {
                    job_id: job.id,
                    url_count: uniqueUrls.length,
                    duplicates_removed_count: duplicatesRemovedCount,
                    invalid_urls_count: invalidCount,
                    created_at: job.created_at,
                    status: 'processing',
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
    async getJobResults(jobId, page = '1', pageSize = '20', filter, layer, confidence) {
        try {
            const pageNum = parseInt(page, 10) || 1;
            const pageSizeNum = parseInt(pageSize, 10) || 20;
            const result = await this.jobsService.getJobResults(jobId, pageNum, pageSizeNum, filter, layer, confidence);
            return {
                success: true,
                data: result.results,
                pagination: result.pagination,
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Job not found')) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Job not found',
                }, common_1.HttpStatus.NOT_FOUND);
            }
            console.error('[JobsController] Error fetching job results:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to retrieve results. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getResultDetails(jobId, resultId) {
        try {
            const result = await this.jobsService.getResultDetails(jobId, resultId);
            if (!result) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Result not found or does not belong to this job',
                }, common_1.HttpStatus.NOT_FOUND);
            }
            return {
                success: true,
                data: {
                    ...result,
                    layer1_factors: result.layer1_factors || {
                        message: 'Factor data not available (processed before schema migration)',
                        reason: 'Layer 1 analysis not completed',
                    },
                    layer2_factors: result.layer2_factors || {
                        message: 'Factor data not available',
                        reason: 'Layer 2 analysis not completed or error occurred',
                    },
                    layer3_factors: result.layer3_factors || {
                        message: 'Factor data not available',
                        reason: 'Layer 3 analysis not completed or error occurred',
                    },
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            console.error('[JobsController] Error fetching result details:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to retrieve result details. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async exportJobResults(jobId, res, format = 'complete', filter, layer, confidence) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(jobId)) {
            throw new common_1.BadRequestException('Invalid job ID format. Must be a valid UUID.');
        }
        const validFormats = ['complete', 'summary', 'layer1', 'layer2', 'layer3'];
        if (!validFormats.includes(format)) {
            throw new common_1.BadRequestException(`Invalid format: ${format}. Must be one of: ${validFormats.join(', ')}`);
        }
        if (filter && !['approved', 'rejected', 'all'].includes(filter)) {
            throw new common_1.BadRequestException(`Invalid filter value: ${filter}. Must be one of: approved, rejected, all`);
        }
        if (layer && !['layer1', 'layer2', 'layer3', 'passed_all', 'all'].includes(layer)) {
            throw new common_1.BadRequestException(`Invalid layer value: ${layer}. Must be one of: layer1, layer2, layer3, passed_all, all`);
        }
        if (confidence && !['high', 'medium', 'low', 'all'].includes(confidence)) {
            throw new common_1.BadRequestException(`Invalid confidence value: ${confidence}. Must be one of: high, medium, low, all`);
        }
        try {
            const stream = await this.exportService.streamCSVExport(jobId, format, {
                filter: filter,
                layer: layer,
                confidence: confidence,
            });
            res.set({
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="job-${jobId}-${format}.csv"`,
            });
            stream.pipe(res);
            stream.on('error', (error) => {
                console.error('[JobsController] Export stream error:', error);
                if (!res.headersSent) {
                    throw new common_1.InternalServerErrorException('Export stream failed');
                }
            });
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            if (error instanceof Error && error.message.includes('Job not found')) {
                throw new common_1.NotFoundException(`Job not found: ${jobId}`);
            }
            console.error('[JobsController] Error exporting results:', error);
            throw new common_1.InternalServerErrorException('Failed to export results. Please try again.');
        }
    }
    async pauseJob(jobId) {
        try {
            await this.queueService.pauseJob(jobId);
            const job = await this.jobsService.getJobById(jobId);
            return {
                success: true,
                data: job,
                message: 'Job paused successfully',
            };
        }
        catch (error) {
            console.error('[JobsController] Error pausing job:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to pause job. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async resumeJob(jobId) {
        try {
            await this.queueService.resumeJob(jobId);
            const job = await this.jobsService.getJobById(jobId);
            return {
                success: true,
                data: job,
                message: 'Job resumed successfully',
            };
        }
        catch (error) {
            console.error('[JobsController] Error resuming job:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to resume job. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteJob(jobId) {
        try {
            await this.jobsService.deleteJob(jobId);
            return {
                success: true,
                message: 'Job deleted successfully',
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Job not found')) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Job not found',
                }, common_1.HttpStatus.NOT_FOUND);
            }
            console.error('[JobsController] Error deleting job:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to delete job. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async cancelJob(jobId) {
        try {
            await this.queueService.cancelJob(jobId);
            const job = await this.jobsService.getJobById(jobId);
            return {
                success: true,
                data: job,
                message: 'Job cancelled successfully',
            };
        }
        catch (error) {
            console.error('[JobsController] Error cancelling job:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to cancel job. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async retryJob(jobId) {
        try {
            await this.queueService.retryJob(jobId);
            const job = await this.jobsService.getJobById(jobId);
            return {
                success: true,
                data: job,
                message: 'Job retry initiated successfully',
            };
        }
        catch (error) {
            console.error('[JobsController] Error retrying job:', error);
            if (error instanceof Error) {
                if (error.message.includes('Job not found')) {
                    throw new common_1.HttpException({
                        success: false,
                        error: 'Job not found',
                    }, common_1.HttpStatus.NOT_FOUND);
                }
                if (error.message.includes('Can only retry failed jobs')) {
                    throw new common_1.HttpException({
                        success: false,
                        error: error.message,
                    }, common_1.HttpStatus.BAD_REQUEST);
                }
            }
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to retry job. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getQueueStatus(includeCompleted, limit, offset) {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 50;
            const parsedOffset = offset ? parseInt(offset, 10) : 0;
            const parsedIncludeCompleted = includeCompleted === 'true';
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
                throw new common_1.BadRequestException('Limit must be a number between 1 and 100');
            }
            if (isNaN(parsedOffset) || parsedOffset < 0) {
                throw new common_1.BadRequestException('Offset must be a non-negative number');
            }
            const activeJobs = await this.jobsService.getActiveJobs(parsedLimit, parsedOffset);
            const responseData = {
                activeJobs,
            };
            if (parsedIncludeCompleted) {
                const completedJobs = await this.jobsService.getCompletedJobs();
                responseData.completedJobs = completedJobs;
            }
            return {
                success: true,
                data: responseData,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            console.error('[JobsController] Error fetching queue status:', error);
            throw new common_1.InternalServerErrorException('Failed to retrieve queue status. Please try again.');
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
__decorate([
    (0, common_1.Get)(':id/results'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __param(3, (0, common_1.Query)('filter')),
    __param(4, (0, common_1.Query)('layer')),
    __param(5, (0, common_1.Query)('confidence')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getJobResults", null);
__decorate([
    (0, common_1.Get)(':id/results/:resultId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('resultId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getResultDetails", null);
__decorate([
    (0, common_1.Post)(':id/export'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Query)('filter')),
    __param(4, (0, common_1.Query)('layer')),
    __param(5, (0, common_1.Query)('confidence')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "exportJobResults", null);
__decorate([
    (0, common_1.Patch)(':id/pause'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "pauseJob", null);
__decorate([
    (0, common_1.Patch)(':id/resume'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "resumeJob", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "deleteJob", null);
__decorate([
    (0, common_1.Delete)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "cancelJob", null);
__decorate([
    (0, common_1.Post)(':id/retry'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "retryJob", null);
__decorate([
    (0, common_1.Get)('queue/status'),
    __param(0, (0, common_1.Query)('includeCompleted')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getQueueStatus", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService,
        file_parser_service_1.FileParserService,
        url_validation_service_1.UrlValidationService,
        queue_service_1.QueueService,
        supabase_service_1.SupabaseService,
        export_service_1.ExportService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map