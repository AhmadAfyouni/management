import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JobTitlesService } from './job-titles.service';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { GetJobTitlesDto } from './dto/get-job-titles.dro';
import { Permissions } from 'src/common/decorators/role.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly jobTitlesService: JobTitlesService) { }

  @Post("create")
  async create(@Body() createJobTitleDto: CreateJobTitleDto) {
    return this.jobTitlesService.create(createJobTitleDto);
  }



  @Permissions("task:read")
  @Get("get-job-titles")
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
  ) {
    return this.jobTitlesService.update(id, updateJobTitleDto);
  }

  @Post('delete/:id')
  async remove(@Param('id') id: string) {
    return this.jobTitlesService.remove(id);
  }
}
