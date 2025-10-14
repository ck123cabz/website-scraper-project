import { Request } from 'express';
import { JobsService } from './jobs.service';
import { FileParserService } from './services/file-parser.service';
import { UrlValidationService } from './services/url-validation.service';
import { CreateJobDto } from './dto/create-job.dto';
export declare class JobsController {
    private readonly jobsService;
    private readonly fileParserService;
    private readonly urlValidationService;
    constructor(jobsService: JobsService, fileParserService: FileParserService, urlValidationService: UrlValidationService);
    createJobWithUrls(file: Express.Multer.File | undefined, body: CreateJobDto, contentType: string, req: Request): Promise<{
        success: boolean;
        data: {
            job_id: string;
            url_count: number;
            duplicates_removed_count: number;
            invalid_urls_count: number;
            created_at: string;
        };
    }>;
    createJob(body: {
        name?: string;
        totalUrls?: number;
    }): Promise<{
        success: boolean;
        data: {
            completed_at: string | null;
            created_at: string;
            current_stage: import("@website-scraper/shared").Database["public"]["Enums"]["processing_stage"] | null;
            current_url: string | null;
            current_url_started_at: string | null;
            estimated_time_remaining: number | null;
            failed_urls: number;
            gemini_cost: number;
            gpt_cost: number;
            id: string;
            name: string | null;
            processed_urls: number;
            processing_rate: number | null;
            progress_percentage: number;
            rejected_urls: number;
            started_at: string | null;
            status: import("@website-scraper/shared").Database["public"]["Enums"]["job_status"];
            successful_urls: number;
            total_cost: number;
            total_urls: number;
            updated_at: string;
        };
    }>;
    getJob(id: string): Promise<{
        success: boolean;
        data: {
            completed_at: string | null;
            created_at: string;
            current_stage: import("@website-scraper/shared").Database["public"]["Enums"]["processing_stage"] | null;
            current_url: string | null;
            current_url_started_at: string | null;
            estimated_time_remaining: number | null;
            failed_urls: number;
            gemini_cost: number;
            gpt_cost: number;
            id: string;
            name: string | null;
            processed_urls: number;
            processing_rate: number | null;
            progress_percentage: number;
            rejected_urls: number;
            started_at: string | null;
            status: import("@website-scraper/shared").Database["public"]["Enums"]["job_status"];
            successful_urls: number;
            total_cost: number;
            total_urls: number;
            updated_at: string;
        };
    }>;
    getAllJobs(): Promise<{
        success: boolean;
        data: {
            completed_at: string | null;
            created_at: string;
            current_stage: import("@website-scraper/shared").Database["public"]["Enums"]["processing_stage"] | null;
            current_url: string | null;
            current_url_started_at: string | null;
            estimated_time_remaining: number | null;
            failed_urls: number;
            gemini_cost: number;
            gpt_cost: number;
            id: string;
            name: string | null;
            processed_urls: number;
            processing_rate: number | null;
            progress_percentage: number;
            rejected_urls: number;
            started_at: string | null;
            status: import("@website-scraper/shared").Database["public"]["Enums"]["job_status"];
            successful_urls: number;
            total_cost: number;
            total_urls: number;
            updated_at: string;
        }[];
    }>;
}
