
// create-company-settings.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsString, IsArray, IsBoolean, ValidateNested, Min, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkDay, ProgressCalculationMethod } from '../schemas/company-settings.schema';

// Custom validator for time validation
@ValidatorConstraint({ name: 'isStartTimeBeforeEndTime', async: false })
export class IsStartTimeBeforeEndTimeConstraint implements ValidatorConstraintInterface {
  validate(startTime: string, args: ValidationArguments) {
    const object = args.object as DayWorkingHoursDto;

    // If either time is missing, let other validators handle it
    if (!startTime || !object.endTime) {
      return true;
    }

    // Only validate if it's a working day
    if (!object.isWorkingDay) {
      return true;
    }

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(object.endTime);

    return startMinutes < endMinutes;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Start time must be before end time';
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

export class DayWorkingHoursDto {
  @IsNotEmpty()
  @IsEnum(WorkDay)
  day: WorkDay;

  @IsNotEmpty()
  @IsBoolean()
  isWorkingDay: boolean;

  @IsOptional()
  @IsString()
  @Validate(IsStartTimeBeforeEndTimeConstraint)
  startTime?: string; // Format: HH:MM

  @IsOptional()
  @IsString()
  endTime?: string; // Format: HH:MM

  @IsOptional()
  @IsNumber()
  @Min(0)
  breakTimeMinutes?: number;
}

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
  @ValidateNested({ each: true })
  @Type(() => DayWorkingHoursDto)
  dayWorkingHours?: DayWorkingHoursDto[];

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
  defaultBreakTimeMinutes?: number;
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