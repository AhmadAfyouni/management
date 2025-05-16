import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';

@Module({
    imports: [
        MulterModule.register({
            dest: './uploads',
            storage: memoryStorage(),
        }),
    ],
    controllers: [FileUploadController],
    providers: [FileUploadService],
})
export class FileUploadModule { }