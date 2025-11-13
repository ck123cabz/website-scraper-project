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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let JobsService = class JobsService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async createJob(data) {
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
            throw new Error(`Failed to create job: ${error.message}`);
        }
        return job;
    }
    async getJobById(id) {
        const { data: job, error } = await this.supabase
            .getClient()
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to fetch job: ${error.message}`);
        }
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
        const { data: job, error } = await this.supabase
            .getClient()
            .from('jobs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update job: ${error.message}`);
        }
        return job;
    }
    async deleteJob(id) {
        const { error } = await this.supabase.getClient().from('jobs').delete().eq('id', id);
        if (error) {
            throw new Error(`Failed to delete job: ${error.message}`);
        }
    }
    async createJobWithUrls(name, urls) {
        const client = this.supabase.getClient();
        const { data, error } = await client
            .rpc('create_job_with_urls', {
            p_name: name || 'Untitled Job',
            p_urls: urls,
        })
            .single();
        if (error) {
            throw new Error(`Failed to create job with URLs: ${error.message}`);
        }
        if (!data) {
            throw new Error('No data returned from job creation');
        }
        const jobId = data.job_id;
        const urlIds = data.url_ids;
        if (!urlIds || urlIds.length === 0) {
            throw new Error('No URL IDs returned from job creation');
        }
        const { data: job, error: fetchError } = await client
            .from('jobs')
            .select('*')
            .eq('id', jobId)
            .single();
        if (fetchError || !job) {
            throw new Error(`Failed to fetch created job: ${fetchError?.message || 'Job not found'}`);
        }
        if (urls.length > 1000) {
            console.log(`[JobsService] Created job ${job.id} with ${urls.length} URLs using atomic transaction`);
        }
        return { job, urlIds };
    }
    async getJobResults(jobId, page = 1, pageSize = 20, filter, layer, confidence) {
        const job = await this.getJobById(jobId);
        if (!job) {
            throw new Error(`Job not found: ${jobId}`);
        }
        const normalizedPageSize = Math.min(pageSize || 20, 100);
        const normalizedPage = Math.max(page || 1, 1);
        const offset = (normalizedPage - 1) * normalizedPageSize;
        const client = this.supabase.getClient();
        let query = client
            .from('url_results')
            .select('*', { count: 'exact' })
            .eq('job_id', jobId);
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
        const { data: results, error, count } = await query;
        if (error) {
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
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map