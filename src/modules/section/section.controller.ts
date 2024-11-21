import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SectionService } from './section.service';
import { CreateSectionDto } from './dtos/create-section.dto';
import { UpdateSectionDto } from './dtos/update-section.dto';
import { GetDepartment } from 'src/common/decorators/user-guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';





@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sections')
export class SectionController {
    constructor(private readonly sectionService: SectionService) { }

    @Post()
    async createSection(@Body() createSectionDto: CreateSectionDto) {
        return this.sectionService.createSection(createSectionDto);
    }

    @Get('project/:projectId')
    async getSectionsByProject(@Param('projectId') projectId: string) {
        return this.sectionService.getSectionsByProject(projectId);
    }

    @Get('department/:departmentId')
    async getSectionsByDepartment(@Param('departmentId') departmentId: string) {
        return this.sectionService.getSectionsByDepartment(departmentId);
    }

    @Get('manager-section')
    async getManageDepartment(@GetDepartment() departmentId: string) {
        return this.sectionService.getSectionsByDepartment(departmentId);
    }

    @Get(':id')
    async getSectionById(@Param('id') id: string) {
        return this.sectionService.getSectionById(id);
    }

    @Put(':id')
    async updateSection(
        @Param('id') id: string,
        @Body() updateSectionDto: UpdateSectionDto
    ) {
        return this.sectionService.updateSection(id, updateSectionDto);
    }

    @Delete(':id')
    async deleteSection(@Param('id') id: string) {
        return this.sectionService.deleteSection(id);
    }
}
