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
        await this.urlProcessingQueue.add('process-url', data, {
            priority: data.priority || 0,
        });
    }
    async addUrlsToQueue(jobs) {
        const bulkJobs = jobs.map((job) => ({
            name: 'process-url',
            data: job,
            opts: {
                priority: job.priority || 0,
            },
        }));
        await this.urlProcessingQueue.addBulk(bulkJobs);
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
            .from('results')
            .select('url')
            .eq('job_id', jobId)
            .is('classification_result', null);
        if (selectError) {
            this.logger.error(`Failed to query unprocessed URLs for job ${jobId}: ${selectError.message}`);
        }
        if (unprocessedUrls && unprocessedUrls.length > 0) {
            this.logger.log(`Job ${jobId} resume: Found ${unprocessedUrls.length} unprocessed URLs - re-queueing`);
            const jobs = unprocessedUrls.map((row) => ({
                jobId,
                url: row.url,
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
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('url-processing-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        supabase_service_1.SupabaseService])
], QueueService);
//# sourceMappingURL=queue.service.js.map