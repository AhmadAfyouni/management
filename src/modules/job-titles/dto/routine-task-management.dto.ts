import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRoutineTaskDto, UpdateRoutineTaskDto } from './routine-task.dto';

// DTO for managing routine task templates
export class RoutineTaskTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  recurringType: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  category?: string; // For grouping routine tasks

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // For filtering and searching

  @ValidateNested()
  @Type(() => CreateRoutineTaskDto)
  taskTemplate: CreateRoutineTaskDto;
}

// DTO for querying routine tasks
export class GetRoutineTasksQueryDto {
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string; // Search in name, description

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// DTO for routine task statistics
export class RoutineTaskStatsDto {
  totalTasks: number;
  activeTasks: number;
  inactiveTasks: number;
  tasksByType: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  avgEstimatedHours: number;
  totalEstimatedHours: number;
  tasksWithSubTasks: number;

  constructor(data: any) {
    this.totalTasks = data.totalTasks || 0;
    this.activeTasks = data.activeTasks || 0;
    this.inactiveTasks = data.inactiveTasks || 0;
    this.tasksByType = data.tasksByType || { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
    this.avgEstimatedHours = data.avgEstimatedHours || 0;
    this.totalEstimatedHours = data.totalEstimatedHours || 0;
    this.tasksWithSubTasks = data.tasksWithSubTasks || 0;
  }
}

// DTO for copying routine tasks between job titles
export class CopyRoutineTasksDto {
  @IsString()
  @IsNotEmpty()
  sourceJobTitleId: string;

  @IsString()
  @IsNotEmpty()
  targetJobTitleId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskNames?: string[]; // If provided, only copy these specific tasks

  @IsOptional()
  @IsBoolean()
  overrideExisting?: boolean = false; // Whether to override existing tasks with same names
}

// DTO for generating routine tasks from templates
export class GenerateRoutineTasksDto {
  @IsString()
  @IsNotEmpty()
  jobTitleId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineTaskTemplateDto)
  templates: RoutineTaskTemplateDto[];

  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean = false;
}
