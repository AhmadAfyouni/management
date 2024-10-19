import { Controller, Post, Get, Param, Delete, Body } from '@nestjs/common';
import { CreateJobCategoryDto } from './dtos/create-category.dto';
import { JobCategoryService } from './job-category.service';

@Controller('job-categories')
export class JobCategoryController {
    constructor(private readonly jobCategoryService: JobCategoryService) { }

    @Post()
    async create(@Body() createJobCategoryDto: CreateJobCategoryDto) {
        return this.jobCategoryService.create(createJobCategoryDto);
    }

    @Get()
    async findAll() {
        return this.jobCategoryService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.jobCategoryService.findOne(id);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.jobCategoryService.delete(id);
    }
    
    @Get('unique/education-experience')
    async findUniqueEducationAndExperience() {
        return this.jobCategoryService.findUniqueEducationAndExperience();
    }

}
