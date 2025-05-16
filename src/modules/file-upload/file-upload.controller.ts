import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
    UseGuards,
    Req,
    Res,
    Logger,
    HttpStatus,
    HttpException,
    Query
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileUploadService } from './file-upload.service';

@Controller("file-upload")
export class FileUploadController {
    private readonly logger = new Logger(FileUploadController.name);

    constructor(private readonly fileService: FileUploadService) { }

    @Post('upload')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('path') path: string = '',
        @Req() req: any,
    ) {
        try {
            if (!file) {
                throw new HttpException('No file was uploaded', HttpStatus.BAD_REQUEST);
            }

            const fileInfo = this.fileService.saveFile(file, path);

            return {
                message: 'File uploaded successfully',
                file: fileInfo,
                userId: req.user.sub || req.user.id,
                userEmail: req.user.email
            };
        } catch (error) {
            this.logger.error(`Error uploading file: ${error.message}`, error.stack);
            throw new HttpException(
                { message: 'Error occurred while uploading file', error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('upload-multiple')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FilesInterceptor('files', 10))
    async uploadMultipleFiles(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('path') path: string = '',
        @Req() req: any,
    ) {
        try {
            if (!files || files.length === 0) {
                throw new HttpException('No files were uploaded', HttpStatus.BAD_REQUEST);
            }

            const uploadedFiles = this.fileService.saveFiles(files, path);

            return {
                message: `${uploadedFiles.length} files uploaded successfully`,
                files: uploadedFiles,
                userId: req.user.sub || req.user.id,
                userEmail: req.user.email,
                customPath: path
            };
        } catch (error) {
            this.logger.error(`Error uploading files: ${error.message}`, error.stack);
            throw new HttpException(
                { message: 'Error occurred while uploading files', error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('files/:customPath/:filename')
    async getFile(
        @Param('customPath') customPath: string,
        @Param('filename') filename: string,
        @Res() res: Response
    ) {
        try {
            this.logger.log(`Attempting to serve file from: ${customPath}/${filename}`);

            const filePath = this.fileService.getFilePath(customPath, filename);

            if (!filePath) {
                this.logger.log(`File not found: ${customPath}/${filename}`);
                return res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
            }

            return res.sendFile(filePath);
        } catch (error) {
            this.logger.error(`Exception in file retrieval: ${error.message}`, error.stack);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Error occurred while retrieving the file',
                error: error.message
            });
        }
    }

    @Get('files')
    async listFiles(@Query('customPath') customPath: string = '') {
        try {
            const result = this.fileService.listFiles(customPath);

            if (!result) {
                throw new HttpException('Directory not found', HttpStatus.NOT_FOUND);
            }

            return result;
        } catch (error) {
            this.logger.error(`Exception in directory listing: ${error.message}`, error.stack);
            throw new HttpException(
                { message: 'Error occurred while retrieving the file list', error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete('files/:customPath/:filename')
    @UseGuards(JwtAuthGuard)
    async deleteFile(
        @Param('customPath') customPath: string,
        @Param('filename') filename: string
    ) {
        try {
            const deleted = this.fileService.deleteFile(customPath, filename);

            if (!deleted) {
                throw new HttpException('File not found', HttpStatus.NOT_FOUND);
            }

            return { message: 'File deleted successfully' };
        } catch (error) {
            this.logger.error(`Error deleting file: ${error.message}`, error.stack);
            throw new HttpException(
                { message: 'Error occurred while deleting the file', error: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('verify-token')
    @UseGuards(JwtAuthGuard)
    verifyToken(@Req() req: any) {
        return {
            message: 'Token is valid',
            user: req.user
        };
    }
}
