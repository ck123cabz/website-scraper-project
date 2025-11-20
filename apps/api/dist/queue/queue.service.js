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
var QueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const supabase_service_1 = require("../supabase/supabase.service");
let QueueService = QueueService_1 = class QueueService {
    constructor(urlProcessingQueue, supabase) {
        this.urlProcessingQueue = urlProcessingQueue;
        this.supabase = supabase;
        this.logger = new common_1.Logger(QueueService_1.name);
        this.urlProcessingQueue.on('error', (err) => {
            this.logger.error(`Queue error: ${err.message}`);
        });
    }
    async addUrlToQueue(data) {
        this.logger.debug(`Adding URL to queue: jobId=${data.jobId}, url=${data.url.slice(0, 100)}, priority=${data.priority || 0}`);
        try {
            await this.urlProcessingQueue.add('process-url', data, {
                priority: data.priority || 0,
            });
            this.logger.debug(`URL queued successfully: ${data.url.slice(0, 100)}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to add URL to queue: ${data.url.slice(0, 100)}, error: ${errorMessage}`);
            throw error;
        }
    }
    async addUrlsToQueue(jobs) {
        const startTime = performance.now();
        this.logger.log(`Adding ${jobs.length} URLs to queue (bulk operation)`);
        try {
            const bulkJobs = jobs.map((job) => ({
                name: 'process-url',
                data: job,
                opts: {
                    priority: job.priority || 0,
                },
            }));
            await this.urlProcessingQueue.addBulk(bulkJobs);
            const duration = performance.now() - startTime;
            this.logger.log(`Successfully queued ${jobs.length} URLs for processing (${duration.toFixed(0)}ms)`);
            if (jobs.length > 1000) {
                this.logger.log(`Large batch queued: ${jobs.length} URLs in ${duration.toFixed(0)}ms (${(jobs.length / (duration / 1000)).toFixed(0)} URLs/sec)`);
            }
        }
        catch (error) {
            const duration = performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to add ${jobs.length} URLs to queue after ${duration.toFixed(0)}ms: ${errorMessage}`);
            throw error;
        }
    }
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.urlProcessingQueue.getWaitingCount(),
            this.urlProcessingQueue.getActiveCount(),
            this.urlProcessingQueue.getCompletedCount(),
            this.urlProcessingQueue.getFailedCount(),
            this.urlProcessingQueue.getDelayedCount(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed,
        };
    }
    async pauseQueue() {
        await this.urlProcessingQueue.pause();
    }
    async resumeQueue() {
        await this.urlProcessingQueue.resume();
    }
    async clearQueue() {
        await this.urlProcessingQueue.drain();
    }
    async pauseJob(jobId) {
        const { error } = await this.supabase
            .getClient()
            .from('jobs')
            .update({ status: 'paused' })
            .eq('id', jobId);
        if (error) {
            this.logger.error(`Failed to pause job ${jobId}: ${error.message}`);
            throw new Error(`Failed to pause job: ${error.message}`);
        }
        this.logger.log(`Job ${jobId} paused - worker will skip remaining URLs`);
    }
    async resumeJob(jobId) {
        const { data: unprocessedUrls, error: selectError } = await this.supabase
            .getClient()
            .from('job_urls')
            .select('id, url')
            .eq('job_id', jobId)
            .in('status', ['queued', 'processing']);
        if (selectError) {
            this.logger.error(`Failed to query unprocessed URLs for job ${jobId}: ${selectError.message}`);
        }
        if (unprocessedUrls && unprocessedUrls.length > 0) {
            this.logger.log(`Job ${jobId} resume: Found ${unprocessedUrls.length} unprocessed URLs - re-queueing`);
            const jobs = unprocessedUrls.map((row) => ({
                jobId,
                url: row.url,
                urlId: row.id,
            }));
            await this.addUrlsToQueue(jobs);
            this.logger.log(`Job ${jobId} resume: ${unprocessedUrls.length} URLs re-queued`);
        }
        else {
            this.logger.log(`Job ${jobId} resume: No unprocessed URLs to re-queue`);
        }
        const { error } = await this.supabase
            .getClient()
            .from('jobs')
            .update({ status: 'processing' })
            .eq('id', jobId);
        if (error) {
            this.logger.error(`Failed to resume job ${jobId}: ${error.message}`);
            throw new Error(`Failed to resume job: ${error.message}`);
        }
        this.logger.log(`Job ${jobId} resumed - worker will continue processing (${unprocessedUrls?.length || 0} URLs re-queued)`);
    }
    async cancelJob(jobId) {
        const { error } = await this.supabase
            .getClient()
            .from('jobs')
            .update({ status: 'cancelled' })
            .eq('id', jobId);
        if (error) {
            this.logger.error(`Failed to cancel job ${jobId}: ${error.message}`);
            throw new Error(`Failed to cancel job: ${error.message}`);
        }
        this.logger.log(`Job ${jobId} cancelled - worker will stop processing, results preserved`);
    }
    async retryJob(jobId) {
        const { data: job, error: jobError } = await this.supabase
            .getClient()
            .from('jobs')
            .select('id, status, total_urls')
            .eq('id', jobId)
            .single();
        if (jobError || !job) {
            this.logger.error(`Failed to find job ${jobId}: ${jobError?.message}`);
            throw new Error(`Job not found: ${jobId}`);
        }
        if (job.status !== 'failed') {
            this.logger.error(`Cannot retry job ${jobId}: status is ${job.status}, expected 'failed'`);
            throw new Error(`Can only retry failed jobs. Current status: ${job.status}`);
        }
        const { data: jobUrls, error: urlsError } = await this.supabase
            .getClient()
            .from('job_urls')
            .select('id, url')
            .eq('job_id', jobId);
        if (urlsError) {
            this.logger.error(`Failed to query URLs for job ${jobId}: ${urlsError.message}`);
            throw new Error(`Failed to retrieve job URLs: ${urlsError.message}`);
        }
        if (!jobUrls || jobUrls.length === 0) {
            this.logger.error(`No URLs found for job ${jobId}`);
            throw new Error(`No URLs found for job ${jobId}`);
        }
        const { error: resetError } = await this.supabase
            .getClient()
            .from('job_urls')
            .update({ status: 'queued' })
            .eq('job_id', jobId);
        if (resetError) {
            this.logger.error(`Failed to reset URL statuses for job ${jobId}: ${resetError.message}`);
            throw new Error(`Failed to reset URL statuses: ${resetError.message}`);
        }
        this.logger.log(`Job ${jobId} retry: Re-queueing ${jobUrls.length} URLs`);
        const jobs = jobUrls.map((row) => ({
            jobId,
            url: row.url,
            urlId: row.id,
        }));
        await this.addUrlsToQueue(jobs);
        const { error: updateError } = await this.supabase
            .getClient()
            .from('jobs')
            .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            completed_at: null,
            processed_urls: 0,
            successful_urls: 0,
            failed_urls: 0,
            rejected_urls: 0,
            total_cost: 0,
            gemini_cost: 0,
            gpt_cost: 0,
        })
            .eq('id', jobId);
        if (updateError) {
            this.logger.error(`Failed to update job status for ${jobId}: ${updateError.message}`);
            throw new Error(`Failed to update job status: ${updateError.message}`);
        }
        this.logger.log(`Job ${jobId} retried successfully - ${jobUrls.length} URLs re-queued, metrics reset`);
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('url-processing-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        supabase_service_1.SupabaseService])
], QueueService);
//# sourceMappingURL=queue.service.js.map