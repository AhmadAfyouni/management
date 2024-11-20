import { Controller, Get, Param, Body, UseGuards, Req, Post } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TasksService } from './task.service';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly taskService: TasksService) { }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create')
    async createTask(@Body() createTaskDto: CreateTaskDto, @GetAccount() userId) {
        createTaskDto.assignee = userId;
        return this.taskService.createTaskForEmp(createTaskDto);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create-task-department')
    async createTaskForDepartment(@Body() createTaskDto: CreateTaskDto, @GetAccount() userId) {
        createTaskDto.assignee = userId;
        return this.taskService.createTaskForDepartment(createTaskDto);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create-task-project')
    async createTaskForProject(@Body() createTaskDto: CreateTaskDto, @GetAccount() userId) {
        createTaskDto.assignee = userId;
        return this.taskService.createTaskForProject(createTaskDto);
    }
    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get("get-my-dept-tasks")
    async getMyDeptTasks(@GetDepartment() departmentId) {
        return this.taskService.getTasksByDepartmentId(departmentId);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get("get-tasks-by-dept/:deptId")
    async getTaskByDept(@Param("deptId") departmentId) {
        return this.taskService.getTasksByDepartmentId(departmentId);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('task/:id')
    async getTaskById(@Param('id') id: string) {
        return this.taskService.getTaskById(id);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Post('update/:id')
    async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
        return this.taskService.updateTask(id, updateTaskDto);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_DELETE)
    @Post('delete/:id')
    async deleteTask(@Param('id') id: string) {
        return this.taskService.deleteTask(id);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get("get-emp-tasks")
    async getEmpTasks(@GetAccount() userId) {
        return this.taskService.getEmpTasks(userId);
    }



    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get("get-project-tasks/:projectId")
    async getProjectTasks(@Param("projectId") projectId) {
        return this.taskService.getProjectTasks(projectId);
    }

    @Roles(UserRole.ADMIN)
    @Get("get-all-tasks")
    async getAllTasks() {
        return this.taskService.getAllTasks();
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Post('update-status/:taskId')
    async updateTaskStatus(
        @Param('taskId') taskId: string,
        @GetAccount() userId: string,
        @Body('newStatus') newStatus: TASK_STATUS
    ) {
        return this.taskService.updateTaskStatus(taskId, userId, newStatus);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('add-subtask/:taskId')
    async addSubtask(@Param('taskId') taskId: string, @Body() createTaskDto: CreateTaskDto, @GetAccount() userId, @GetDepartment() departmentId) {
        createTaskDto.department_id = departmentId
        createTaskDto.assignee = userId;
        return this.taskService.addSubtask(taskId, createTaskDto);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Post('update-description/:taskId')
    async updateDescription(@Param('taskId') taskId: string, @Body('newDescription') newDescription: string) {
        return this.taskService.updateDescription(taskId, newDescription);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('weekly-tasks')
    async getWeeklyTasks(@GetAccount() userId: string) {
        return this.taskService.getWeeklyTasks(userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('monthly-tasks')
    async getMonthlyTasks(@GetAccount() userId: string) {
        return this.taskService.getMonthlyTasks(userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('on-test-tasks')
    async getOnTestTasks(@GetDepartment() departmentId) {
        return this.taskService.getOnTestTask(departmentId);
    }

    @Get("get-sub-tasks/:parentId")
    async getSubTaskByParnetTask(@Param("parentId") parentId: string) {
        return await this.taskService.getSubTaskByParentTask(parentId);
    }
    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Get('start/:taskId')
    async startTask(
        @Param('taskId') taskId: string,
        @GetAccount() userId: string
    ) {
        return this.taskService.startTask(taskId, userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Get('pause/:taskId')
    async pauseTask(
        @Param('taskId') taskId: string,
        @GetAccount() userId: string
    ) {
        return this.taskService.pauseTask(taskId, userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Get('complete/:taskId')
    async completeTask(
        @Param('taskId') taskId: string,
        @GetAccount() userId: string
    ) {
        return this.taskService.completeTask(taskId, userId);
    }

    @Get("tree")
    async getTaskTree(@GetAccount() empId: string) {
        return this.taskService.buildTaskTree(empId);
    }
}
