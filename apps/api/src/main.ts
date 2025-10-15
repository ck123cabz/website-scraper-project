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
  // Validate environment before creating app
  validateEnvironment();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable shutdown hooks for graceful shutdown on SIGTERM (Railway deployments)
  // This allows workers and other services to clean up properly
  app.enableShutdownHooks();

  // Enable CORS for frontend communication
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
