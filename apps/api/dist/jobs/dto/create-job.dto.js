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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateJobDto = void 0;
const class_validator_1 = require("class-validator");
class CreateJobDto {
}
exports.CreateJobDto = CreateJobDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJobDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(10000, { message: 'Maximum 10,000 URLs allowed per job' }),
    (0, class_validator_1.IsString)({ each: true, message: 'Each URL must be a string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateJobDto.prototype, "urls", void 0);
//# sourceMappingURL=create-job.dto.js.map