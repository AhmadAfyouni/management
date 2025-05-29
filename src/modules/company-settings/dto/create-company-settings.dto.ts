import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsString, IsArray, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkDay, ProgressCalculationMethod } from '../schemas/company-settings.schema';

export class TaskFieldSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableEstimatedTime?: boolean;

  @IsOptional()
  @IsBoolean()
  enableActualTime?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePriority?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDueDate?: boolean;

  @IsOptional()
  @IsBoolean()
  enableFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  enableComments?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSubTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  enableTimeTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  enableRecurring?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDependencies?: boolean;
}

export class WorkSettingsDto {
  @IsOptional()
  @IsArray()
  @IsEnum(WorkDay, { each: true })
  workDays?: WorkDay[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  officialWorkingHoursPerDay?: number;

  @IsOptional()
  @IsString()
  workStartTime?: string; // Format: HH:MM

  @IsOptional()
  @IsString()
  workEndTime?: string; // Format: HH:MM

  @IsOptional()
  @IsArray()
  holidays?: string[]; // Array of date strings

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  overtimeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  breakTimeMinutes?: number;
}

export class CreateCompanySettingsDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => WorkSettingsDto)
  workSettings: WorkSettingsDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TaskFieldSettingsDto)
  taskFieldSettings: TaskFieldSettingsDto;

  @IsOptional()
  @IsEnum(ProgressCalculationMethod)
  progressCalculationMethod?: ProgressCalculationMethod;

  @IsOptional()
  @IsBoolean()
  allowTaskDuplication?: boolean;

  @IsOptional()
  @IsBoolean()
  requireTaskApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  autoGenerateTaskIds?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultTaskReminderDays?: number;

  @IsOptional()
  @IsBoolean()
  enableEmailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  enableTaskDeadlineReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  enableProjectDeadlineReminders?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxFileUploadSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];
}
