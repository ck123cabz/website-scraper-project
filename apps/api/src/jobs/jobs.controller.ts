import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async createJob(@Body() body: { name?: string; totalUrls?: number }) {
    try {
      const job = await this.jobsService.createJob(body);
      return {
        success: true,
        data: job,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    try {
      const job = await this.jobsService.getJobById(id);

      if (!job) {
        throw new HttpException(
          {
            success: false,
            error: 'Job not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: job,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getAllJobs() {
    try {
      const jobs = await this.jobsService.getAllJobs();
      return {
        success: true,
        data: jobs,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
