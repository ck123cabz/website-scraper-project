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
        const jobData = {
            name: name || 'Untitled Job',
            total_urls: urls.length,
            status: 'pending',
        };
        const { data: job, error: jobError } = await client
            .from('jobs')
            .insert(jobData)
            .select()
            .single();
        if (jobError) {
            throw new Error(`Failed to create job: ${jobError.message}`);
        }
        const BATCH_SIZE = 1000;
        const batches = [];
        for (let i = 0; i < urls.length; i += BATCH_SIZE) {
            const batch = urls.slice(i, i + BATCH_SIZE).map((url) => ({
                job_id: job.id,
                url,
                status: 'success',
            }));
            batches.push(batch);
        }
        for (let i = 0; i < batches.length; i++) {
            const { error: insertError } = await client.from('results').insert(batches[i]);
            if (insertError) {
                await this.deleteJob(job.id);
                throw new Error(`Failed to insert URLs (batch ${i + 1}/${batches.length}): ${insertError.message}`);
            }
            if (batches.length > 1) {
                console.log(`[JobsService] Inserted batch ${i + 1}/${batches.length} (${batches[i].length} URLs)`);
            }
        }
        return job;
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map