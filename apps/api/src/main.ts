import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

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
