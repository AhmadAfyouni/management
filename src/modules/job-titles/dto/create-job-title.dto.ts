import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PermissionsEnum } from 'src/config/permissions.enum';

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
  permissions: PermissionsEnum[];

  @IsMongoId()
  department_id: string;

  @IsMongoId()
  category: string;

  @IsBoolean()
  @IsOptional()
  is_manager: boolean;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessibleDepartments: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessibleJobTitles: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  accessibleEmps: string[];
}
