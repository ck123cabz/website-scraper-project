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
const create_job_dto_1 = require("./dto/create-job.dto");
const path_1 = require("path");
let JobsController = class JobsController {
    constructor(jobsService, fileParserService, urlValidationService, queueService, supabase) {
        this.jobsService = jobsService;
        this.fileParserService = fileParserService;
        this.urlValidationService = urlValidationService;
        this.queueService = queueService;
        this.supabase = supabase;
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
                data: result,
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
    async exportJobResults(jobId, format = 'csv', status = '', classification = '', search = '', res) {
        try {
            let query = this.supabase
                .getClient()
                .from('results')
                .select('*')
                .eq('job_id', jobId)
                .order('processed_at', { ascending: false });
            if (status && status !== '') {
                query = query.eq('status', status);
            }
            if (classification && classification !== '') {
                query = query.eq('classification_result', classification);
            }
            if (search && search !== '') {
                query = query.ilike('url', `%${search}%`);
            }
            const { data: results, error } = await query;
            if (error) {
                throw new Error(error.message);
            }
            if (!results || results.length === 0) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'No results found to export',
                }, common_1.HttpStatus.NOT_FOUND);
            }
            const { data: job } = await this.supabase
                .getClient()
                .from('jobs')
                .select('name')
                .eq('id', jobId)
                .single();
            const jobName = job?.name || 'job';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${jobName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}`;
            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
                res.send(JSON.stringify(results, null, 2));
            }
            else {
                const headers = [
                    'URL',
                    'Status',
                    'Classification',
                    'Score',
                    'Reasoning',
                    'LLM Provider',
                    'Cost',
                    'Processing Time (ms)',
                    'Retry Count',
                    'Error Message',
                    'Prefilter Passed',
                    'Prefilter Reasoning',
                    'Processed At',
                ];
                const csvRows = [headers.join(',')];
                for (const result of results) {
                    const row = [
                        `"${(result.url || '').replace(/"/g, '""')}"`,
                        result.status || '',
                        result.classification_result || '',
                        result.classification_score || '',
                        `"${(result.classification_reasoning || '').replace(/"/g, '""')}"`,
                        result.llm_provider || '',
                        result.llm_cost || '0',
                        result.processing_time_ms || '',
                        result.retry_count || '0',
                        `"${(result.error_message || '').replace(/"/g, '""')}"`,
                        result.prefilter_passed !== null ? result.prefilter_passed : '',
                        `"${(result.prefilter_reasoning || '').replace(/"/g, '""')}"`,
                        result.processed_at || '',
                    ];
                    csvRows.push(row.join(','));
                }
                const csvContent = csvRows.join('\n');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
                res.send(csvContent);
            }
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            console.error('[JobsController] Error exporting results:', error);
            throw new common_1.HttpException({
                success: false,
                error: 'Failed to export results. Please try again.',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
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
    (0, common_1.Get)(':id/export'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('classification')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
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
    (0, common_1.Delete)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "cancelJob", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService,
        file_parser_service_1.FileParserService,
        url_validation_service_1.UrlValidationService,
        queue_service_1.QueueService,
        supabase_service_1.SupabaseService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map