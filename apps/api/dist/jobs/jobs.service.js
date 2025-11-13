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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let JobsService = JobsService_1 = class JobsService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(JobsService_1.name);
    }
    async createJob(data) {
        this.logger.log(`Creating new job: name="${data.name || 'Untitled Job'}", totalUrls=${data.totalUrls || 0}`);
        try {
            const jobData = {
                name: data.name || 'Untitled Job',
                total_urls: data.totalUrls || 0,
                status: 'pending',
            };
            const { data: job, error } = await this.supabase
                .getClient()
                .from('jobs')
                .insert(jobData)
                .select()
                .single();
            if (error) {
                this.logger.error(`Failed to create job: ${error.message}`, error.stack);
                throw new Error(`Failed to create job: ${error.message}`);
            }
            this.logger.log(`Job created successfully: id=${job.id}, status=${job.status}, totalUrls=${job.total_urls}`);
            this.logger.debug(`Job details: createdAt=${job.created_at}`);
            return job;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create job: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async getJobById(id) {
        this.logger.debug(`Fetching job: ${id}`);
        const { data: job, error } = await this.supabase
            .getClient()
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                this.logger.warn(`Job not found: ${id}`);
                return null;
            }
            this.logger.error(`Failed to fetch job ${id}: ${error.message}`);
            throw new Error(`Failed to fetch job: ${error.message}`);
        }
        const progress = job.total_urls > 0 ? Math.round(((job.processed_urls || 0) / job.total_urls) * 100) : 0;
        this.logger.debug(`Job fetched: ${id}, status=${job.status}, progress=${progress}%, ${job.processed_urls || 0}/${job.total_urls} URLs`);
        return job;
    }
    async getAllJobs() {
        const { data: jobs, error } = await this.supabase
            .getClient()
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            throw new Error(`Failed to fetch jobs: ${error.message}`);
        }
        return jobs || [];
    }
    async updateJob(id, updates) {
        const updateFields = Object.keys(updates).join(', ');
        this.logger.log(`Updating job: id=${id}, fields=[${updateFields}]`);
        try {
            const { data: job, error } = await this.supabase
                .getClient()
                .from('jobs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                this.logger.error(`Failed to update job ${id}: ${error.message}`);
                throw new Error(`Failed to update job: ${error.message}`);
            }
            if (updates.status) {
                this.logger.log(`Job status updated: id=${id}, newStatus=${updates.status}`);
            }
            this.logger.debug(`Job updated successfully: id=${id}`);
            return job;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to update job ${id}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async deleteJob(id) {
        this.logger.log(`Deleting job: ${id}`);
        try {
            const { error } = await this.supabase.getClient().from('jobs').delete().eq('id', id);
            if (error) {
                this.logger.error(`Failed to delete job ${id}: ${error.message}`);
                throw new Error(`Failed to delete job: ${error.message}`);
            }
            this.logger.log(`Job deleted successfully: ${id}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to delete job ${id}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async createJobWithUrls(name, urls) {
        const startTime = performance.now();
        this.logger.log(`Creating job with URLs: name="${name}", urlCount=${urls.length}`);
        try {
            const client = this.supabase.getClient();
            const { data, error } = await client
                .rpc('create_job_with_urls', {
                p_name: name || 'Untitled Job',
                p_urls: urls,
            })
                .single();
            if (error) {
                this.logger.error(`Failed to create job with URLs: ${error.message}`);
                throw new Error(`Failed to create job with URLs: ${error.message}`);
            }
            if (!data) {
                this.logger.error('No data returned from job creation');
                throw new Error('No data returned from job creation');
            }
            const jobId = data.job_id;
            const urlIds = data.url_ids;
            if (!urlIds || urlIds.length === 0) {
                this.logger.error(`No URL IDs returned from job creation for job ${jobId}`);
                throw new Error('No URL IDs returned from job creation');
            }
            const { data: job, error: fetchError } = await client
                .from('jobs')
                .select('*')
                .eq('id', jobId)
                .single();
            if (fetchError || !job) {
                this.logger.error(`Failed to fetch created job: ${fetchError?.message || 'Job not found'}`);
                throw new Error(`Failed to fetch created job: ${fetchError?.message || 'Job not found'}`);
            }
            const duration = performance.now() - startTime;
            this.logger.log(`Job with URLs created successfully: id=${job.id}, status=${job.status}, urlCount=${urls.length}, urlIdsCount=${urlIds.length} (${duration.toFixed(0)}ms)`);
            if (urls.length > 1000) {
                this.logger.log(`Large batch job created: ${job.id} with ${urls.length} URLs using atomic transaction (${duration.toFixed(0)}ms)`);
            }
            return { job, urlIds };
        }
        catch (error) {
            const duration = performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create job with URLs after ${duration.toFixed(0)}ms: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async getJobResults(jobId, page = 1, pageSize = 20, filter, layer, confidence) {
        this.logger.debug(`Querying job results: jobId=${jobId}, page=${page}, pageSize=${pageSize}, filter=${filter || 'all'}, layer=${layer || 'all'}, confidence=${confidence || 'all'}`);
        const job = await this.getJobById(jobId);
        if (!job) {
            throw new Error(`Job not found: ${jobId}`);
        }
        const normalizedPageSize = Math.min(pageSize || 20, 100);
        const normalizedPage = Math.max(page || 1, 1);
        const offset = (normalizedPage - 1) * normalizedPageSize;
        const client = this.supabase.getClient();
        let query = client.from('url_results').select('*', { count: 'exact' }).eq('job_id', jobId);
        if (filter && filter !== 'all') {
            query = query.eq('status', filter);
        }
        if (layer && layer !== 'all') {
            query = query.eq('eliminated_at_layer', layer);
        }
        if (confidence && confidence !== 'all') {
            query = query.eq('confidence_band', confidence);
        }
        query = query.order('processed_at', { ascending: false });
        query = query.range(offset, offset + normalizedPageSize - 1);
        const queryStart = performance.now();
        const { data: results, error, count } = await query;
        const queryDuration = performance.now() - queryStart;
        const target = 500;
        if (queryDuration > target) {
            this.logger.warn(`Query slow - getJobResults took ${queryDuration.toFixed(0)}ms (target: ${target}ms, returned ${results?.length || 0} rows)`);
        }
        else {
            this.logger.debug(`Query fast - getJobResults took ${queryDuration.toFixed(0)}ms (returned ${results?.length || 0} rows)`);
        }
        if (error) {
            this.logger.error(`Query failed: ${error.message}`);
            throw new Error(`Failed to fetch job results: ${error.message}`);
        }
        const total = count || 0;
        const pages = Math.ceil(total / normalizedPageSize);
        return {
            results: results || [],
            pagination: {
                total,
                page: normalizedPage,
                pageSize: normalizedPageSize,
                pages,
            },
        };
    }
    async getResultDetails(jobId, resultId) {
        const client = this.supabase.getClient();
        const { data: result, error } = await client
            .from('url_results')
            .select('*')
            .eq('id', resultId)
            .eq('job_id', jobId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to fetch result details: ${error.message}`);
        }
        return result;
    }
    async getQueuePosition(jobId) {
        const client = this.supabase.getClient();
        const { data: queuedJobs, error } = await client
            .from('jobs')
            .select('id')
            .eq('status', 'queued')
            .order('created_at', { ascending: true });
        if (error) {
            throw new Error(`Failed to fetch queued jobs: ${error.message}`);
        }
        if (!queuedJobs || queuedJobs.length === 0) {
            return null;
        }
        const jobIndex = queuedJobs.findIndex((job) => job.id === jobId);
        if (jobIndex === -1) {
            return null;
        }
        return jobIndex + 1;
    }
    async getEstimatedWaitTime(jobId) {
        const queuePosition = await this.getQueuePosition(jobId);
        if (!queuePosition) {
            return null;
        }
        const job = await this.getJobById(jobId);
        if (!job) {
            return null;
        }
        if (job.total_urls === 0) {
            return 60;
        }
        const avgSecondsPerUrl = await this.getAverageSecondsPerUrl();
        const estimatedJobTime = job.total_urls * avgSecondsPerUrl;
        const jobsAhead = queuePosition - 1;
        if (jobsAhead === 0) {
            return 60;
        }
        const waitSeconds = jobsAhead * estimatedJobTime * 1.05;
        return Math.min(Math.round(waitSeconds), 86400);
    }
    async getAverageSecondsPerUrl() {
        const client = this.supabase.getClient();
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: completedJobs, error } = await client
            .from('jobs')
            .select('created_at, completed_at, total_urls')
            .eq('status', 'completed')
            .gte('completed_at', twentyFourHoursAgo)
            .not('completed_at', 'is', null)
            .gt('total_urls', 0);
        if (error) {
            console.warn(`Failed to fetch completed jobs for estimation: ${error.message}`);
            return 30;
        }
        if (!completedJobs || completedJobs.length === 0) {
            return 30;
        }
        let totalSecondsPerUrl = 0;
        let validJobCount = 0;
        for (const job of completedJobs) {
            if (!job.completed_at || !job.created_at) {
                continue;
            }
            const createdAt = new Date(job.created_at).getTime();
            const completedAt = new Date(job.completed_at).getTime();
            const processingTimeMs = completedAt - createdAt;
            if (processingTimeMs <= 0) {
                continue;
            }
            const processingTimeSeconds = processingTimeMs / 1000;
            const secondsPerUrl = processingTimeSeconds / job.total_urls;
            totalSecondsPerUrl += secondsPerUrl;
            validJobCount++;
        }
        if (validJobCount === 0) {
            return 30;
        }
        const average = totalSecondsPerUrl / validJobCount;
        return Math.max(Math.round(average), 1);
    }
    calculateProgress(job) {
        const { urlCount, completedCount } = job;
        if (urlCount < 0 || completedCount < 0) {
            return 0;
        }
        if (urlCount === 0) {
            return 0;
        }
        if (completedCount >= urlCount) {
            return 100;
        }
        const progress = (completedCount / urlCount) * 100;
        return Math.round(progress);
    }
    async getActiveJobs(limit = 50, offset = 0) {
        const client = this.supabase.getClient();
        const { data: jobs, error } = await client
            .from('jobs')
            .select('*')
            .in('status', ['processing', 'pending'])
            .order('status', { ascending: false })
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);
        if (error) {
            throw new Error(`Failed to fetch active jobs: ${error.message}`);
        }
        if (!jobs || jobs.length === 0) {
            return [];
        }
        const { data: allQueuedJobs, error: queueError } = await client
            .from('jobs')
            .select('id, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
        if (queueError) {
            throw new Error(`Failed to fetch queued jobs: ${queueError.message}`);
        }
        const queuePositions = new Map();
        if (allQueuedJobs) {
            allQueuedJobs.forEach((job, index) => {
                queuePositions.set(job.id, index + 1);
            });
        }
        return jobs.map((job) => {
            const isQueued = job.status === 'pending';
            const status = isQueued ? 'queued' : 'processing';
            const urlCount = job.total_urls || 0;
            const completedCount = job.processed_urls || 0;
            const progress = urlCount > 0 ? Math.round((completedCount / urlCount) * 100) : 0;
            const layer1 = job.layer1_eliminated || 0;
            const layer2 = job.layer2_eliminated || 0;
            const layer3 = job.layer3_classified || 0;
            const queuePosition = isQueued ? queuePositions.get(job.id) || null : null;
            const estimatedWaitTime = isQueued && queuePosition ? queuePosition * 300 : null;
            return {
                id: job.id,
                name: job.name || 'Untitled Job',
                status,
                progress,
                layerBreakdown: {
                    layer1,
                    layer2,
                    layer3,
                },
                queuePosition,
                estimatedWaitTime,
                urlCount,
                completedCount,
                createdAt: job.created_at,
            };
        });
    }
    async getCompletedJobs() {
        const client = this.supabase.getClient();
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: jobs, error } = await client
            .from('jobs')
            .select('*')
            .eq('status', 'completed')
            .gte('completed_at', twentyFourHoursAgo)
            .order('completed_at', { ascending: false })
            .limit(10);
        if (error) {
            throw new Error(`Failed to fetch completed jobs: ${error.message}`);
        }
        if (!jobs || jobs.length === 0) {
            return [];
        }
        return jobs.map((job) => ({
            id: job.id,
            name: job.name || 'Untitled Job',
            completedAt: job.completed_at,
            urlCount: job.total_urls || 0,
            totalCost: job.total_cost || 0,
        }));
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map