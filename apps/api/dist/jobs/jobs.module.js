"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jobs_controller_1 = require("./jobs.controller");
const jobs_service_1 = require("./jobs.service");
const file_parser_service_1 = require("./services/file-parser.service");
const url_validation_service_1 = require("./services/url-validation.service");
const prefilter_service_1 = require("./services/prefilter.service");
const layer1_domain_analysis_service_1 = require("./services/layer1-domain-analysis.service");
const layer2_operational_filter_service_1 = require("./services/layer2-operational-filter.service");
const llm_service_1 = require("./services/llm.service");
const llm_service_mock_1 = require("./services/llm.service.mock");
const confidence_scoring_service_1 = require("./services/confidence-scoring.service");
const export_service_1 = require("./services/export.service");
const archival_service_1 = require("./services/archival.service");
const cleanup_service_1 = require("./services/cleanup.service");
const queue_module_1 = require("../queue/queue.module");
const settings_module_1 = require("../settings/settings.module");
const scraper_module_1 = require("../scraper/scraper.module");
const multer_1 = require("multer");
const path_1 = require("path");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            queue_module_1.QueueModule,
            settings_module_1.SettingsModule,
            scraper_module_1.ScraperModule,
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.memoryStorage)(),
                limits: {
                    fileSize: 10 * 1024 * 1024,
                },
                fileFilter: (req, file, callback) => {
                    const allowedExtensions = ['.csv', '.txt'];
                    const ext = (0, path_1.extname)(file.originalname).toLowerCase();
                    if (allowedExtensions.includes(ext)) {
                        callback(null, true);
                    }
                    else {
                        callback(new Error('Invalid file type. Only .csv and .txt files are allowed.'), false);
                    }
                },
            }),
        ],
        controllers: [jobs_controller_1.JobsController],
        providers: [
            jobs_service_1.JobsService,
            file_parser_service_1.FileParserService,
            url_validation_service_1.UrlValidationService,
            prefilter_service_1.PreFilterService,
            layer1_domain_analysis_service_1.Layer1DomainAnalysisService,
            layer2_operational_filter_service_1.Layer2OperationalFilterService,
            confidence_scoring_service_1.ConfidenceScoringService,
            export_service_1.ExportService,
            archival_service_1.ArchivalService,
            cleanup_service_1.CleanupService,
            {
                provide: llm_service_1.LlmService,
                useClass: process.env.USE_MOCK_SERVICES === 'true' ? llm_service_mock_1.MockLlmService : llm_service_1.LlmService,
            },
        ],
        exports: [
            jobs_service_1.JobsService,
            prefilter_service_1.PreFilterService,
            layer1_domain_analysis_service_1.Layer1DomainAnalysisService,
            layer2_operational_filter_service_1.Layer2OperationalFilterService,
            llm_service_1.LlmService,
            confidence_scoring_service_1.ConfidenceScoringService,
            export_service_1.ExportService,
        ],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map