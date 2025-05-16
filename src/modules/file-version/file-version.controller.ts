import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, HttpStatus, HttpCode, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileVersionService } from './file-version.service';
import { EntityType, FileType, FileTypeString, GetFileVersionsDto, GetSpecificVersionDto, RestoreVersionDto, UpdateFileVersionDto } from './dto/file-version.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../upload/upload.service';

@Controller('file-versions')
@UseGuards(JwtAuthGuard)
export class FileVersionController {
  constructor(
    private readonly fileVersionService: FileVersionService,
    private readonly fileUploadService: FileUploadService
  ) { }

  /**
   * Get version history with pagination
   */
  @Get('history')
  async getVersionHistory(
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    const history = await this.fileVersionService.getFileVersionHistory({
      originalName: fileName,
      fileType: fileType as (FileType | FileTypeString),
      entityType: entityType as (EntityType | string),
      entityId,
      documentType,
      documentName,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    });

    return {
      status: true,
      message: 'File version history retrieved successfully',
      data: history
    };
  }

  /**
   * Get all versions of a file
   */
  @Get('all')
  async getAllVersions(
    @Query() getVersionsDto: GetFileVersionsDto
  ) {
    const versions = await this.fileVersionService.getAllFileVersions(getVersionsDto);

    return {
      status: true,
      message: 'File versions retrieved successfully',
      data: {
        versions,
        total: versions.length,
        latest: versions.length > 0 ? versions[0] : null
      }
    };
  }

  /**
   * Get all versions of a department file
   */
  @Get('department/:departmentId')
  async getDepartmentFileVersions(
    @Param('departmentId') departmentId: string,
    @Query('fileType') fileType: FileTypeString,
    @Query('fileName') fileName: string
  ) {
    const versions = await this.fileVersionService.getDepartmentFileVersions(
      fileName,
      departmentId,
      fileType as (FileType | FileTypeString)
    );

    return {
      status: true,
      message: 'File versions retrieved successfully',
      data: {
        versions,
        total: versions.length,
        latest: versions.length > 0 ? versions[0] : null
      }
    };
  }

  /**
   * Get all versions of an employee file
   */
  @Get('employee/:empId')
  async getEmployeeFileVersions(
    @Param('empId') empId: string,
    @Query('fileType') fileType: FileTypeString,
    @Query('fileName') fileName: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const versions = await this.fileVersionService.getEmployeeFileVersions(
      fileName,
      empId,
      fileType as (FileType | FileTypeString),
      documentType,
      documentName
    );

    return {
      status: true,
      message: 'File versions retrieved successfully',
      data: {
        versions,
        total: versions.length,
        latest: versions.length > 0 ? versions[0] : null
      }
    };
  }

  /**
   * Get current version of a file
   */
  @Get('current')
  async getCurrentVersion(
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const currentVersion = await this.fileVersionService.getCurrentVersion({
      originalName: fileName,
      fileType: fileType as (FileType | FileTypeString),
      entityType: entityType as (EntityType | string),
      entityId,
      documentType,
      documentName
    });

    return {
      status: Boolean(currentVersion),
      message: currentVersion
        ? 'Current version retrieved successfully'
        : 'No current version found',
      data: currentVersion
    };
  }

  /**
   * Get specific version of a file
   */
  @Get('version')
  async getSpecificVersion(
    @Query() getSpecificVersionDto: GetSpecificVersionDto
  ) {
    const version = await this.fileVersionService.getSpecificVersion(getSpecificVersionDto);

    return {
      status: Boolean(version),
      message: version
        ? `Version ${getSpecificVersionDto.version} retrieved successfully`
        : `Version ${getSpecificVersionDto.version} not found`,
      data: version
    };
  }

  /**
   * Compare two versions of a file
   */
  @Get('compare')
  async compareVersions(
    @Query('fileName') fileName: string,
    @Query('version1') version1: number,
    @Query('version2') version2: number,
    @Query('fileType') fileType: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const comparison = await this.fileVersionService.compareVersions({
      originalName: fileName,
      version1: Number(version1),
      version2: Number(version2),
      fileType: fileType as (FileType | FileTypeString),
      entityType: entityType as (EntityType | string),
      entityId,
      documentType,
      documentName
    });

    return {
      status: true,
      message: 'Version comparison retrieved successfully',
      data: comparison
    };
  }

  /**
   * Upload a new version of a department file
   */
  @Post('department/:departmentId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDepartmentFileVersion(
    @Param('departmentId') departmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileType') fileType: FileTypeString,
    @Body('description') description?: string,
    @Req() req?: any
  ) {
    const uploadPath = `departments/${departmentId}/${fileType}`;
    const userId = req.user?.sub;

    // Upload the file
    const fileUrl = await this.fileUploadService.uploadSingleFile(
      file,
      uploadPath,
      req.headers.authorization?.split(' ')[1] || ''
    );

    // Create a new version in the version history
    await this.fileVersionService.createDepartmentFileVersion(
      fileUrl,
      departmentId,
      fileType as (FileType | FileTypeString),
      {
        description,
        createdBy: userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size
      }
    );

    return {
      status: true,
      message: 'File version uploaded successfully',
      data: {
        fileUrl,
        originalName: file.originalname
      }
    };
  }

  /**
   * Upload a new version of an employee file
   */
  @Post('employee/:empId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEmployeeFileVersion(
    @Param('empId') empId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileType') fileType: FileTypeString,
    @Body('documentType') documentType: string,
    @Body('documentName') documentName?: string,
    @Body('description') description?: string,
    @Req() req?: any
  ) {
    const uploadPath = `employees/${empId}/${fileType}/${documentType || 'general'}`;
    const userId = req.user?.sub;

    // Upload the file
    const fileUrl = await this.fileUploadService.uploadSingleFile(
      file,
      uploadPath,
      req.headers.authorization?.split(' ')[1] || ''
    );

    // Create a new version in the version history
    await this.fileVersionService.createEmployeeFileVersion(
      fileUrl,
      empId,
      fileType as (FileType | FileTypeString),
      documentType,
      {
        documentName,
        description,
        createdBy: userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size
      }
    );

    return {
      status: true,
      message: 'File version uploaded successfully',
      data: {
        fileUrl,
        originalName: file.originalname
      }
    };
  }

  /**
   * Update metadata for a specific version
   */
  @Put('version/:versionId')
  async updateVersionMetadata(
    @Param('versionId') versionId: string,
    @Body() updateDto: UpdateFileVersionDto
  ) {
    const result = await this.fileVersionService.updateVersionMetadata(versionId, updateDto);

    return {
      status: true,
      message: 'Version metadata updated successfully',
      data: result
    };
  }

  /**
   * Restore a previous version as the current version
   */
  @Post('restore')
  async restoreVersion(
    @Body() restoreDto: RestoreVersionDto,
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string,
    @Req() req?: any
  ) {
    const userId = req.user?.sub;

    const result = await this.fileVersionService.restoreVersion({
      originalName: fileName,
      versionToRestore: restoreDto.versionToRestore,
      fileType: fileType as (FileType | FileTypeString),
      entityType: entityType as (EntityType | string),
      entityId,
      documentType,
      documentName,
      createdBy: userId
    });

    return {
      status: true,
      message: result.message,
      data: {
        fileUrl: result.fileUrl,
        version: result.version
      }
    };
  }

  /**
   * Delete all versions of a file
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAllVersions(
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const success = await this.fileVersionService.deleteAllVersions({
      originalName: fileName,
      fileType: fileType as (FileType | FileTypeString),
      entityType: entityType as (EntityType | string),
      entityId,
      documentType,
      documentName
    });

    return {
      status: success,
      message: success
        ? 'All file versions deleted successfully'
        : 'No file versions found to delete',
    };
  }

  /**
   * Delete a specific version of a file
   */
  @Delete('version')
  @HttpCode(HttpStatus.OK)
  async deleteSpecificVersion(
    @Query('fileName') fileName: string,
    @Query('version') version: number,
    @Query('fileType') fileType: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('documentType') documentType?: string,
    @Query('documentName') documentName?: string
  ) {
    const success = await this.fileVersionService.deleteSpecificVersion({
      originalName: fileName,
      version: Number(version),
      fileType: fileType as (FileType | FileTypeString),
      entityType: entityType as (EntityType | string),
      entityId,
      documentType,
      documentName
    });

    return {
      status: success,
      message: success
        ? `Version ${version} deleted successfully`
        : `Version ${version} not found or could not be deleted`,
    };
  }
}