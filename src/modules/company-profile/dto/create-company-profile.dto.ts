import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessType } from '../schemas/company-profile.schema';

export class SocialMediaLinksDto {
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

export class LicensesCertificationsDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  number: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}

export class CreateCompanyProfileDto {
  // Basic Information
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companyLogo?: string;

  @IsNotEmpty()
  @IsString()
  commercialRegistrationNumber: string;

  @IsNotEmpty()
  @IsDateString()
  establishmentDate: string;

  @IsNotEmpty()
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsNotEmpty()
  @IsString()
  companyDescription: string;

  // Contact and Location
  @IsNotEmpty()
  @IsEmail()
  officialEmail: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  companyAddress: string;

  @IsOptional()
  @IsString()
  locationMapUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaLinksDto)
  socialMediaLinks?: SocialMediaLinksDto;

  // Legal and Financial Information
  @IsNotEmpty()
  @IsString()
  taxNumber: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LicensesCertificationsDto)
  licensesCertifications?: LicensesCertificationsDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  termsAndConditionsFiles?: string[];

  // Administrative Structure
  @IsNotEmpty()
  @IsString()
  ceoName: string;

  @IsOptional()
  @IsString()
  organizationalStructureFile?: string;
}
