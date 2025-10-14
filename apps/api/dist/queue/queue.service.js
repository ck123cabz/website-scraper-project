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
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let QueueService = class QueueService {
    constructor(urlProcessingQueue) {
        this.urlProcessingQueue = urlProcessingQueue;
        this.urlProcessingQueue.on('error', (err) => {
            console.error('[QueueService] Queue error:', err);
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
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('url-processing-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], QueueService);
//# sourceMappingURL=queue.service.js.map