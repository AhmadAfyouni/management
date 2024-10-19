import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateJobCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  required_education: string;

  @IsString()
  @IsNotEmpty()
  required_experience: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  required_skills: string[];
}
