import { Controller, Get, Param, Query, UseGuards, Delete, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileVersionService } from './file-version.service';

@Controller('file-versions')
@UseGuards(JwtAuthGuard)
export class FileVersionController {
  constructor(
    private readonly fileVersionService: FileVersionService
  ) { }

  /**
   * Get all versions of a department file
   */
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
      message: 'File versions retrieved successfully',
      data: {
        versions: versions,
        latest: versions.length > 0 ? versions[0].fileUrl : null
      }
    };
  }

  /**
   * Get all versions of an employee file
   */
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
      message: 'File versions retrieved successfully',
      data: {
        versions: versions,
        latest: versions.length > 0 ? versions[0].fileUrl : null
      }
    };
  }

  /**
   * Get all versions of a task file
   */
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
      message: 'File versions retrieved successfully',
      data: {
        versions: versions,
        latest: versions.length > 0 ? versions[0].fileUrl : null
      }
    };
  }

  /**
   * Get latest version of a department file
   */
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
        ? 'Latest version retrieved successfully'
        : 'No version found for this file',
      data: {
        latestVersion
      }
    };
  }

  /**
   * Get latest version of an employee file
   */
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
        ? 'Latest version retrieved successfully'
        : 'No version found for this file',
      data: {
        latestVersion
      }
    };
  }

  /**
   * Get latest version of a task file
   */
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
        ? 'Latest version retrieved successfully'
        : 'No version found for this file',
      data: {
        latestVersion
      }
    };
  }

  /**
   * Get specific version of a file
   */
  @Get(':entityType/:entityId/version/:versionNumber')
  async getSpecificVersion(
    @Param('entityType') entityType: 'department' | 'employee' | 'task',
    @Param('entityId') entityId: string,
    @Param('versionNumber') versionNumber: number,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const fileUrl = await this.fileVersionService.getSpecificVersion(
      fileName,
      Number(versionNumber),
      entityId,
      entityType,
      fileType,
      documentType,
      documentName
    );

    return {
      status: Boolean(fileUrl),
      message: fileUrl
        ? `Version ${versionNumber} retrieved successfully`
        : `Version ${versionNumber} not found for this file`,
      data: {
        fileUrl
      }
    };
  }

  /**
   * Delete all versions of a file
   */
  @Delete(':entityType/:entityId')
  @HttpCode(HttpStatus.OK)
  async deleteAllVersions(
    @Param('entityType') entityType: 'department' | 'employee' | 'task',
    @Param('entityId') entityId: string,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const success = await this.fileVersionService.deleteAllVersions(
      fileName,
      entityId,
      entityType,
      fileType,
      documentType,
      documentName
    );

    return {
      status: success,
      message: success
        ? 'All file versions deleted successfully'
        : 'No file versions found to delete',
    };
  }

  /**
   * Delete specific version of a file
   */
  @Delete(':entityType/:entityId/version/:versionNumber')
  @HttpCode(HttpStatus.OK)
  async deleteSpecificVersion(
    @Param('entityType') entityType: 'department' | 'employee' | 'task',
    @Param('entityId') entityId: string,
    @Param('versionNumber') versionNumber: number,
    @Query('fileType') fileType: string,
    @Query('fileName') fileName: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const success = await this.fileVersionService.deleteSpecificVersion(
      fileName,
      Number(versionNumber),
      entityId,
      entityType,
      fileType,
      documentType,
      documentName
    );

    return {
      status: success,
      message: success
        ? `Version ${versionNumber} deleted successfully`
        : `Version ${versionNumber} not found or could not be deleted`,
    };
  }
}