import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }

    @Post()
    async createProject(@Body() createProjectDto: CreateProjectDto, @GetAccount() empId) {
        createProjectDto.assignee = empId;
        return this.projectService.createProject(createProjectDto);
    }

    @Get('get-contributors-project/:projectId')
    async getContributorsProject(@Param('projectId') projectId: string) {
        return this.projectService.getContributorsProject(projectId);
    }

    @Get('department/:departmentId')
    async getProjectsByDepartment(@Param('departmentId') departmentId: string) {
        return this.projectService.getProjectsByDepartment(departmentId);
    }

    @Get('get-project-by-id/:id')
    async getProjectById(@Param('id') id: string) {
        return this.projectService.getProjectById(id);
    }

    @Get('get-all-projects')
    async getAllProject() {
        return this.projectService.getAllProject();
    }

    @Get('get-emp-project')
    async getEmpProject(@GetAccount() accountId) {
        return await this.projectService.getEmpProject(accountId);
    }

    @Roles(UserRole.PRIMARY_USER)
    @Get('get-manager-project')
    async getMyProject(@GetDepartment() departmentId) {
        return await this.projectService.getManagerProject(departmentId);
    }

    @Post('update/:id')
    async updateProject(
        @Param('id') id: string,
        @Body() updateProjectDto: UpdateProjectDto,
        @GetAccount() empId,
    ) {
        return await this.projectService.updateProject(id, updateProjectDto, empId);
    }

    @Delete(':id')
    async deleteProject(@Param('id') id: string) {
        return this.projectService.deleteProject(id);
    }

    @Get("project-details/:id")
    async getProjectDetails(@Param('id') id: string, @GetDepartment() departmentId) {
        return this.projectService.getProjectDetails(id, departmentId);
    }
    @Get("project-departments-tree/:projectId")
    async getTaskDetailsProject(@Param('projectId') projectId: string, @GetDepartment() deparmentId) {
        return this.projectService.getDepartmentProject(deparmentId, projectId);
    }

    @Get("complete-project/:projectId")
    async canCompleteProject(@Param('projectId') projectId: string) {
        return await this.projectService.canCompleteProject(projectId);
    }
}
