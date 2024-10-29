import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JobTitlesService } from './job-titles.service';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { GetJobTitlesDto } from './dto/get-job-titles.dro';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly jobTitlesService: JobTitlesService) { }


  @Roles(UserRole.PRIMARY_USER)
  @RequiredPermissions(PermissionsEnum.JOB_TITLE_ADD)
  @Post("create")
  async create(@Body() createJobTitleDto: CreateJobTitleDto) {
    return this.jobTitlesService.create(createJobTitleDto);
  }

  @Roles(UserRole.PRIMARY_USER)
  @RequiredPermissions(PermissionsEnum.JOB_TITLE_SEARCH_AND_VIEW)
  @Get("get-job-titles")
  async findAll(): Promise<GetJobTitlesDto[]> {
    return this.jobTitlesService.findAll();
  }


  @Roles(UserRole.PRIMARY_USER)
  @RequiredPermissions(PermissionsEnum.JOB_TITLE_SEARCH_AND_VIEW)
  @Get('find/:id')
  async findOne(@Param('id') id: string): Promise<GetJobTitlesDto> {
    return this.jobTitlesService.findOne(id);
  }



  @Roles(UserRole.PRIMARY_USER)
  @RequiredPermissions(PermissionsEnum.JOB_TITLE_UPDATE)
  @Post('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateJobTitleDto: UpdateJobTitleDto
  ) {
    return this.jobTitlesService.update(id, updateJobTitleDto);
  }


  @Roles(UserRole.PRIMARY_USER)
  @RequiredPermissions(PermissionsEnum.JOB_TITLE_DELETE)
  @Post('delete/:id')
  async remove(@Param('id') id: string) {
    return this.jobTitlesService.remove(id);
  }
}
