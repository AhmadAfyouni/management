import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Template, TemplateSchema } from './schema/tamplate.schema';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Template.name, schema: TemplateSchema }
        ])
    ],
    controllers: [TemplateController],
    providers: [TemplateService],
    exports: [TemplateService],
})
export class TemplateModule { }
