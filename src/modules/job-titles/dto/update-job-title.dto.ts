import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateJobTitleDto } from './create-job-title.dto';
import { UpdateRoutineTaskDto, CreateRoutineTaskDto } from './routine-task.dto';

// First, create a base class without routine tasks for proper inheritance
export class BaseUpdateJobTitleDto extends PartialType(
  OmitType(CreateJobTitleDto, ['routineTasks'] as const)
) {}

// Then extend with proper routine task handling
export class UpdateJobTitleDto extends BaseUpdateJobTitleDto {
  // Override routine tasks to allow for partial updates
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRoutineTaskDto)
  @IsOptional()
  routineTasks?: UpdateRoutineTaskDto[];
}

// Alternative: Simple update DTO that doesn't inherit from CreateJobTitleDto
export class SimpleUpdateJobTitleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];

  @IsString()
  @IsOptional()
  department_id?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  is_manager?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accessibleDepartments?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accessibleJobTitles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accessibleEmps?: string[];

  @IsBoolean()
  @IsOptional()
  hasRoutineTasks?: boolean;

  @IsBoolean()
  @IsOptional()
  autoGenerateRoutineTasks?: boolean;

  // Routine tasks can be either create or update format
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object) // Use Object to allow both types
  @IsOptional()
  routineTasks?: (CreateRoutineTaskDto | UpdateRoutineTaskDto)[];
}

// Additional DTOs for specific routine task operations
export class AddRoutineTaskDto {
  @IsString()
  jobTitleId: string;

  @ValidateNested()
  @Type(() => CreateRoutineTaskDto)
  routineTask: CreateRoutineTaskDto;
}

export class RemoveRoutineTaskDto {
  @IsString()
  jobTitleId: string;

  @IsString()
  routineTaskName: string;
}

export class UpdateRoutineTaskStatusDto {
  @IsString()
  jobTitleId: string;

  @IsString()
  routineTaskName: string;

  @IsBoolean()
  isActive: boolean;
}

export class BulkUpdateRoutineTasksDto {
  @IsString()
  jobTitleId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRoutineTaskDto)
  routineTasks: UpdateRoutineTaskDto[];

  @IsBoolean()
  @IsOptional()
  replaceAll?: boolean = false; // If true, replace all existing routine tasks
}

// DTO for replacing routine tasks entirely
export class ReplaceRoutineTasksDto {
  @IsString()
  jobTitleId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoutineTaskDto)
  routineTasks: CreateRoutineTaskDto[];
}

// DTO for updating specific routine task
export class UpdateSpecificRoutineTaskDto {
  @IsString()
  jobTitleId: string;

  @IsString()
  routineTaskName: string; // To identify which task to update

  @ValidateNested()
  @Type(() => UpdateRoutineTaskDto)
  updates: UpdateRoutineTaskDto;
}
