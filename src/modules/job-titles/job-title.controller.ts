import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { JobTitlesService } from './job-titles.service';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { JobTitles } from './schema/job-ttiles.schema';
import { GetJobTitlesDto } from './dto/get-job-titles.dro';

@Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly jobTitlesService: JobTitlesService) { }

  @Post("create")
  async create(@Body() createJobTitleDto: CreateJobTitleDto): Promise<JobTitles> {
    return this.jobTitlesService.create(createJobTitleDto);
  }

  @Get("get-job-title")
  async findAll(): Promise<GetJobTitlesDto[]> {
    return this.jobTitlesService.findAll();
  }

  @Get('find/:id')
  async findOne(@Param('id') id: string): Promise<GetJobTitlesDto> {
    return this.jobTitlesService.findOne(id);
  }

  @Post('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateJobTitleDto: UpdateJobTitleDto
  ): Promise<JobTitles> {
    return this.jobTitlesService.update(id, updateJobTitleDto);
  }

  @Post('delete/:id')
  async remove(@Param('id') id: string): Promise<JobTitles> {
    return this.jobTitlesService.remove(id);
  }
}
