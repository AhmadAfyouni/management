import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';

@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    @Post()
    async createProject(@Body() createProjectDto: CreateProjectDto) {
        return this.projectService.createProject(createProjectDto);
    }

    @Get('department/:departmentId')
    async getProjectsByDepartment(@Param('departmentId') departmentId: string) {
        return this.projectService.getProjectsByDepartment(departmentId);
    }

    @Get(':id')
    async getProjectById(@Param('id') id: string) {
        return this.projectService.getProjectById(id);
    }

    @Put(':id')
    async updateProject(
        @Param('id') id: string,
        @Body() updateProjectDto: UpdateProjectDto
    ) {
        return this.projectService.updateProject(id, updateProjectDto);
    }

    @Delete(':id')
    async deleteProject(@Param('id') id: string) {
        return this.projectService.deleteProject(id);
    }
}
