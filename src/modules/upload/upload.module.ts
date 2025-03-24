import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileUploadService } from './upload.service';

@Module({
  imports: [ConfigModule],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule { }