import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  urls?: string[];
}
