import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileVersionService } from './file-version.service';
import { FileVersionController } from './file-version.controller';
import { FileVersion, FileVersionSchema } from './schema/file-version.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: FileVersion.name, schema: FileVersionSchema },
        ]),
    ],
    controllers: [FileVersionController],
    providers: [FileVersionService],
    exports: [FileVersionService],
})
export class FileVersionModule { }