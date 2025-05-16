import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileService } from './file-manager.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileController {
    constructor(
        private readonly fileService: FileService,
    ) { }

    /**
     * Upload a new file or create a new version
     */
    @Post('upload')
    async uploadFile(@Body() uploadDto: {
        fileUrl: string;
        originalName: string;
        entityType: string;
        entityId: string;
        fileType?: string;
        description?: string;
        createdBy?: string;
    }) {
        const result = await this.fileService.uploadFile(uploadDto);

        return {
            status: true,
            message: result.message,
            data: {
                fileId: result.fileId,
                versionId: result.versionId,
                version: result.version,
                fileUrl: result.fileUrl
            }
        };
    }

    /**
     * Get all versions of a file
     */
    @Get(':fileId/versions')
    async getFileVersions(@Param('fileId') fileId: string) {
        const versions = await this.fileService.getFileVersions(fileId);

        return {
            status: true,
            message: 'File versions retrieved successfully',
            data: {
                versions,
                total: versions.length,
                current: versions.find(v => v.isCurrentVersion)
            }
        };
    }

    /**
     * Set a specific version as the current version
     */
    @Put('version/:versionId/set-current')
    async setCurrentVersion(@Param('versionId') versionId: string) {
        const result = await this.fileService.setCurrentVersion(versionId);

        return {
            status: true,
            message: result.message,
            data: {
                versionId: result.versionId,
                version: result.version,
                fileUrl: result.fileUrl
            }
        };
    }

    /**
     * Get files by entity (department, employee, task)
     */
    @Get('entity/:entityType/:entityId')
    async getFilesByEntity(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
        @Query('fileType') fileType?: string
    ) {
        const files = await this.fileService.getFilesByEntity(entityType, entityId, fileType);

        return {
            status: true,
            message: 'Files retrieved successfully',
            data: {
                files,
                total: files.length
            }
        };
    }

    /**
     * Delete a file and all its versions
     */
    @Delete(':fileId')
    @HttpCode(HttpStatus.OK)
    async deleteFile(@Param('fileId') fileId: string) {
        const success = await this.fileService.deleteFile(fileId);

        return {
            status: success,
            message: success
                ? 'File and all versions deleted successfully'
                : 'File not found or could not be deleted',
        };
    }

    /**
     * Delete a specific version of a file
     * Note: Cannot delete the current version
     */
    @Delete('version/:versionId')
    @HttpCode(HttpStatus.OK)
    async deleteVersion(@Param('versionId') versionId: string) {
        try {
            const success = await this.fileService.deleteVersion(versionId);

            return {
                status: success,
                message: 'Version deleted successfully',
            };
        } catch (error) {
            return {
                status: false,
                message: error.message || 'Could not delete version',
            };
        }
    }
}