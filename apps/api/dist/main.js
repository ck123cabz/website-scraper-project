"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_1 = require("@bull-board/express");
const bullmq_1 = require("bullmq");
const common_1 = require("@nestjs/common");
function validateEnvironment() {
    const logger = new common_1.Logger('Bootstrap');
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
    const logger = new common_1.Logger('Bootstrap');
    validateEnvironment();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.enableShutdownHooks();
    process.on('SIGTERM', async () => {
        logger.log('SIGTERM received, closing server gracefully...');
        await app.close();
        logger.log('Server closed gracefully');
        process.exit(0);
    });
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
    ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
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