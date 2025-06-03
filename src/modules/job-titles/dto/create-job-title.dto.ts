import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { CreateRoutineTaskDto } from './routine-task.dto';

export class CreateJobTitleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  responsibilities: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(PermissionsEnum, { each: true })
  permissions: PermissionsEnum[] = [];

  @IsMongoId()
  department_id: string;

  @IsMongoId()
  category: string;

  @IsBoolean()
  @IsOptional()
  is_manager: boolean = false;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessibleDepartments: string[] = [];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessibleJobTitles: string[] = [];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessibleEmps: string[] = [];

  // New routine tasks fields
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoutineTaskDto)
  @IsOptional()
  routineTasks: CreateRoutineTaskDto[] = [];

  @IsBoolean()
  @IsOptional()
  hasRoutineTasks: boolean = false;

  @IsBoolean()
  @IsOptional()
  autoGenerateRoutineTasks: boolean = true;
}
