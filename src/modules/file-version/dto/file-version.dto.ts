import { IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export enum FileType {
  SUPPORTING = 'supporting',
  TEMPLATE = 'template',
  PROGRAM = 'program',
  CERTIFICATION = 'certification',
  LEGAL_DOCUMENT = 'legal_document',
  TASK = 'task',
  GENERAL = 'general'
}

// String literal equivalents for backward compatibility
export type FileTypeString = 'supporting' | 'template' | 'program' | 'certification' | 'legal_document' | 'task' | 'general';

export enum EntityType {
  DEPARTMENT = 'department',
  EMPLOYEE = 'employee',
  TASK = 'task'
}

export class CreateFileVersionDto {
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsEnum(FileType)
  @IsNotEmpty()
  fileType: FileType | FileTypeString;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsMongoId()
  empId?: string;

  @IsOptional()
  @IsMongoId()
  taskId?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class GetFileVersionsDto {
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsEnum(FileType)
  @IsNotEmpty()
  fileType: FileType | FileTypeString;

  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: EntityType | string;

  @IsMongoId()
  @IsNotEmpty()
  entityId: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentName?: string;
}

export class GetSpecificVersionDto {
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsNumber()
  @IsNotEmpty()
  version: number;

  @IsEnum(FileType)
  @IsNotEmpty()
  fileType: FileType;

  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: EntityType;

  @IsMongoId()
  @IsNotEmpty()
  entityId: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentName?: string;
}

export class FileVersionResponse {
  id: string;
  originalName: string;
  fileUrl: string;
  version: number;
  createdAt: Date;
  fileType: FileType;
  entityType: EntityType;
  entityId: string;
  description?: string;
  createdBy?: string;
  documentType?: string;
  documentName?: string;
  mimeType?: string;
  fileSize?: number;
}

export class UpdateFileVersionDto {
  @IsOptional()
  @IsString()
  description?: string;
}

export class RestoreVersionDto {
  @IsNumber()
  @IsNotEmpty()
  versionToRestore: number;
}
