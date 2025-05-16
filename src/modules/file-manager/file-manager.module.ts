import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileController } from './file-manager.controller';
import { FileService } from './file-manager.service';
import { FileVersion, FileVersionSchema } from './schemas/file-version.scheme';
import { FileSchema } from './schemas/file.scheme';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: File.name, schema: FileSchema },
            { name: FileVersion.name, schema: FileVersionSchema },
        ]),
    ],
    controllers: [FileController],
    providers: [FileService],
    exports: [FileService],
})
export class FileModule { }