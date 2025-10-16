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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const ioredis_1 = __importDefault(require("ioredis"));
let HealthController = class HealthController {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.startTime = Date.now();
        this.redisClient = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
        });
    }
    async getHealth() {
        const uptime = (Date.now() - this.startTime) / 1000;
        let databaseStatus = 'unknown';
        try {
            const { data, error } = await this.supabaseService.getClient()
                .from('jobs')
                .select('id')
                .limit(1);
            databaseStatus = error ? 'error' : 'connected';
        }
        catch (error) {
            databaseStatus = 'error';
        }
        let redisStatus = 'unknown';
        try {
            await this.redisClient.ping();
            redisStatus = 'connected';
        }
        catch (error) {
            redisStatus = 'error';
        }
        const isHealthy = databaseStatus === 'connected' && redisStatus === 'connected';
        return {
            status: isHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime,
            database: databaseStatus,
            redis: redisStatus,
            environment: process.env.NODE_ENV || 'development',
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], HealthController);
//# sourceMappingURL=health.controller.js.map