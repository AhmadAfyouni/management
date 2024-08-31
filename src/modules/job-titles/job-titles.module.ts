import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobTitlesController } from './job-title.controller';
import { JobTitlesService } from './job-titles.service';
import { JobTitles, JobTitlesSchema } from './schema/job-ttiles.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: JobTitles.name, schema: JobTitlesSchema }])],
  controllers: [JobTitlesController],
  providers: [JobTitlesService],
  exports: [JobTitlesService],
})
export class JobTitlesModule {}
