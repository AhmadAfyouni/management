import { IsArray, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateJobTitleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  grade_level: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  responsibilities: string[];

  @IsArray()
  @IsMongoId({ each: true })
  permissions: string[];

  @IsMongoId()
  department_id: string;

  @IsMongoId()
  category:string;
}
