import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyProfileDto } from './create-company-profile.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateCompanyProfileDto extends PartialType(CreateCompanyProfileDto) {
  @IsOptional()
  @IsBoolean()
  isSetupCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
