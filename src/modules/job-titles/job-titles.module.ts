import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common/utils';
import { MongooseModule } from '@nestjs/mongoose';
import { EmpModule } from '../emp/emp.module';
import { JobTitlesController } from './job-title.controller';
import { JobTitlesService } from './job-titles.service';
import { JobTitles, JobTitlesSchema } from './schema/job-ttiles.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: JobTitles.name, schema: JobTitlesSchema }]),
  forwardRef(()=>EmpModule),
],
  controllers: [JobTitlesController],
  providers: [JobTitlesService],
  exports: [JobTitlesService],
})
export class JobTitlesModule { }
