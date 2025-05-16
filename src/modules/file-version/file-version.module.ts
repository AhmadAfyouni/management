import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileUploadModule } from '../upload/upload.module';
import { FileVersionController } from './file-version.controller';
import { FileVersionService } from './file-version.service';
import { FileVersionSchema } from './schema/file-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FileVersion', schema: FileVersionSchema },
    ]),
    FileUploadModule
  ],
  controllers: [FileVersionController],
  providers: [FileVersionService],
  exports: [FileVersionService]
})
export class FileVersionModule { }