"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_1 = require("@bull-board/express");
const bullmq_1 = require("bullmq");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });
    const serverAdapter = new express_1.ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    const redisConnection = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    };
    const urlProcessingQueue = new bullmq_1.Queue('url-processing-queue', {
        connection: redisConnection,
    });
    (0, api_1.createBullBoard)({
        queues: [new bullMQAdapter_1.BullMQAdapter(urlProcessingQueue)],
        serverAdapter,
    });
    app.use('/admin/queues', serverAdapter.getRouter());
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`API server running on http://localhost:${port}`);
    console.log(`Bull Board dashboard available at http://localhost:${port}/admin/queues`);
}
bootstrap();
//# sourceMappingURL=main.js.map