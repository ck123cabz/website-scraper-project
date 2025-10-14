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
const multer_1 = require("multer");
const path_1 = require("path");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.diskStorage)({
                    destination: '/tmp/uploads',
                    filename: (req, file, callback) => {
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                        callback(null, file.fieldname + '-' + uniqueSuffix + (0, path_1.extname)(file.originalname));
                    },
                }),
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
        providers: [jobs_service_1.JobsService, file_parser_service_1.FileParserService, url_validation_service_1.UrlValidationService],
        exports: [jobs_service_1.JobsService],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map