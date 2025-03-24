import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileVersionService } from './file-version.service';

@Controller('file-versions')
@UseGuards(JwtAuthGuard)
export class FileVersionController {
  constructor(
    private readonly fileVersionService: FileVersionService
  ) {}

  @Get('department/:departmentId')
  async getDepartmentFileVersions(
    @Param('departmentId') departmentId: string,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string
  ) {
    const versions = await this.fileVersionService.getDepartmentFileVersions(
      fileName,
      departmentId,
      fileType
    );
    
    return {
      status: true,
      message: 'تم الحصول على نسخ الملف بنجاح',
      data: {
        versions: versions,
        latest: versions.length > 0 ? versions[0].fileUrl : null
      }
    };
  }

  @Get('employee/:empId')
  async getEmployeeFileVersions(
    @Param('empId') empId: string,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const versions = await this.fileVersionService.getEmployeeFileVersions(
      fileName,
      empId,
      fileType,
      documentType,
      documentName
    );
    
    return {
      status: true,
      message: 'تم الحصول على نسخ الملف بنجاح',
      data: {
        versions: versions,
        latest: versions.length > 0 ? versions[0].fileUrl : null
      }
    };
  }

  @Get('task/:taskId')
  async getTaskFileVersions(
    @Param('taskId') taskId: string,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string
  ) {
    const versions = await this.fileVersionService.getTaskFileVersions(
      fileName,
      taskId,
      fileType
    );
    
    return {
      status: true,
      message: 'تم الحصول على نسخ الملف بنجاح',
      data: {
        versions: versions,
        latest: versions.length > 0 ? versions[0].fileUrl : null
      }
    };
  }

  @Get('department/:departmentId/latest')
  async getLatestDepartmentFileVersion(
    @Param('departmentId') departmentId: string,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string
  ) {
    const latestVersion = await this.fileVersionService.getLatestDepartmentFileVersion(
      fileName,
      departmentId,
      fileType
    );
    
    return {
      status: Boolean(latestVersion),
      message: latestVersion 
        ? 'تم الحصول على أحدث نسخة بنجاح' 
        : 'لم يتم العثور على أي نسخة لهذا الملف',
      data: {
        latestVersion
      }
    };
  }

  @Get('employee/:empId/latest')
  async getLatestEmployeeFileVersion(
    @Param('empId') empId: string,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const latestVersion = await this.fileVersionService.getLatestEmployeeFileVersion(
      fileName,
      empId,
      fileType,
      documentType,
      documentName
    );
    
    return {
      status: Boolean(latestVersion),
      message: latestVersion 
        ? 'تم الحصول على أحدث نسخة بنجاح' 
        : 'لم يتم العثور على أي نسخة لهذا الملف',
      data: {
        latestVersion
      }
    };
  }

  @Get('task/:taskId/latest')
  async getLatestTaskFileVersion(
    @Param('taskId') taskId: string,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string
  ) {
    const latestVersion = await this.fileVersionService.getLatestTaskFileVersion(
      fileName,
      taskId,
      fileType
    );
    
    return {
      status: Boolean(latestVersion),
      message: latestVersion 
        ? 'تم الحصول على أحدث نسخة بنجاح' 
        : 'لم يتم العثور على أي نسخة لهذا الملف',
      data: {
        latestVersion
      }
    };
  }
}