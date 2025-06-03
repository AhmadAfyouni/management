import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SubTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours: number = 0;
}

export class CreateRoutineTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  recurringType: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsNumber()
  @Min(1)
  @IsOptional()
  intervalDays: number = 1;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours: number = 0;

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority: 'low' | 'medium' | 'high' = 'medium';

  @IsBoolean()
  @IsOptional()
  isActive: boolean = true;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  instructions: string[] = [];

  @IsBoolean()
  @IsOptional()
  hasSubTasks: boolean = false;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubTaskDto)
  @IsOptional()
  subTasks: SubTaskDto[] = [];
}

export class UpdateRoutineTaskDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  @IsOptional()
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsNumber()
  @Min(1)
  @IsOptional()
  intervalDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  instructions?: string[];

  @IsBoolean()
  @IsOptional()
  hasSubTasks?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubTaskDto)
  @IsOptional()
  subTasks?: SubTaskDto[];
}

export class GetRoutineTaskDto {
  name: string;
  description: string;
  recurringType: string;
  intervalDays: number;
  estimatedHours: number;
  priority: string;
  isActive: boolean;
  instructions: string[];
  hasSubTasks: boolean;
  subTasks: { name: string; description: string; estimatedHours: number }[];

  constructor(routineTask: any) {
    this.name = routineTask.name;
    this.description = routineTask.description;
    this.recurringType = routineTask.recurringType;
    this.intervalDays = routineTask.intervalDays || 1;
    this.estimatedHours = routineTask.estimatedHours || 0;
    this.priority = routineTask.priority || 'medium';
    this.isActive = routineTask.isActive !== undefined ? routineTask.isActive : true;
    this.instructions = routineTask.instructions || [];
    this.hasSubTasks = routineTask.hasSubTasks || false;
    this.subTasks = routineTask.subTasks || [];
  }
}
