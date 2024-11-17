import { Controller, Post, Get, Param, Delete, Body, UseGuards } from '@nestjs/common';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { UserRole } from 'src/config/role.enum';
import { CreateJobCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { JobCategoryService } from './job-category.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-categories')
export class JobCategoryController {
    constructor(private readonly jobCategoryService: JobCategoryService) { }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.JOB_TITLE_CATEGORY_ADD)
    @Post()
    async create(@Body() createJobCategoryDto: CreateJobCategoryDto) {
        return this.jobCategoryService.create(createJobCategoryDto);
    }



    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.JOB_TITLE_CATEGORY_SEARCH_AND_VIEW)
    @Get()
    async findAll() {
        return this.jobCategoryService.findAll();
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.JOB_TITLE_CATEGORY_SEARCH_AND_VIEW)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.jobCategoryService.findOne(id);
    }



    @Roles(UserRole.ADMIN)
    @RequiredPermissions(PermissionsEnum.JOB_TITLE_CATEGORY_DELETE)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.jobCategoryService.delete(id);
    }


    @Get('unique/education-experience')
    async findUniqueEducationAndExperience() {
        return this.jobCategoryService.findUniqueEducationAndExperience();
    }

    @Post("update-job-category/:id")
    async updateJobCategory(@Body() updateJobCategoryDto: UpdateCategoryDto, @Param('id') id: string) {
        return this.jobCategoryService.update(id, updateJobCategoryDto);
    }
}
