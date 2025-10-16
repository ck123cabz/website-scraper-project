// Load .env BEFORE any modules are imported (Story 3.0 Task 8 - Mock Services Fix)
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';

/**
 * Validate required environment variables at startup
 * Fails fast if critical configuration is missing
 * Story 2.5: Environment validation (Security pattern from Stories 2.2, 2.3, 2.4)
 */
function validateEnvironment(): void {
  const logger = new Logger('Bootstrap');
  const requiredEnvVars = [
    'SCRAPINGBEE_API_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'REDIS_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
  ];

  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Application cannot start without required configuration.');
    logger.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  logger.log('✅ Environment validation passed - all required variables present');
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment before creating app
  validateEnvironment();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable shutdown hooks for graceful shutdown on SIGTERM (Railway deployments)
  // Story 3.2 AC13: Graceful shutdown handling
  app.enableShutdownHooks();

  // Handle SIGTERM for graceful shutdown (Railway sends this 10s before kill)
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, closing server gracefully...');
    await app.close();
    logger.log('Server closed gracefully');
    process.exit(0);
  });

  // Enable CORS for frontend communication (Story 3.2 - Production deployment)
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000', // Always allow local development
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Set up Bull Board Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const redisConnection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  };

  const urlProcessingQueue = new Queue('url-processing-queue', {
    connection: redisConnection,
  });

  createBullBoard({
    queues: [new BullMQAdapter(urlProcessingQueue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`API server running on http://localhost:${port}`);
  console.log(`Bull Board dashboard available at http://localhost:${port}/admin/queues`);
}

bootstrap();
