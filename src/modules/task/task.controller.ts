import { Controller, Get, Param, Body, UseGuards, Post, BadRequestException, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { CreateSubTaskDto, CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { GetTreeDto } from './dtos/get-tree.dto';
import { TaskCoreService } from './task-core.service';
import { TaskSubtaskService } from './task-subtask.service';
import { TaskTimeTrackingService } from './task-time-tracking.service';
import { TaskQueryService } from './task-query.service';
import { TaskStatusService } from './task.status.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
    constructor(
        private readonly taskCoreService: TaskCoreService,
        private readonly taskSubtaskService: TaskSubtaskService,
        private readonly taskTimeTrackingService: TaskTimeTrackingService,
        private readonly taskQueryService: TaskQueryService,
        private readonly taskStatusService: TaskStatusService,
    ) { }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create')
    async createTask(@Body() createTaskDto: CreateTaskDto, @GetAccount() userId) {
        createTaskDto.assignee = userId;
        return this.taskCoreService.createTaskForEmp(createTaskDto);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create-task-department')
    async createTaskForDepartment(@Body() createTaskDto: CreateTaskDto, @GetAccount() userId) {
        createTaskDto.assignee = userId;
        return this.taskCoreService.createTaskForDepartment(createTaskDto);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create-task-project')
    async createTaskForProject(@Body() createTaskDto: CreateTaskDto, @GetAccount() userId) {
        createTaskDto.assignee = userId;
        return this.taskCoreService.createTaskForProject(createTaskDto);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('get-my-dept-tasks')
    async getMyDeptTasks(@GetDepartment() departmentId) {
        return this.taskQueryService.getTasksByDepartmentId(departmentId);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('get-tasks-by-dept/:deptId')
    async getTaskByDept(@Param('deptId') departmentId) {
        return this.taskQueryService.getTasksByDepartmentId(departmentId);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('task/:id')
    async getTaskById(@Param('id') id: string) {
        return this.taskCoreService.getTaskById(id);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Post('update/:id')
    async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @GetAccount() empId) {
        return this.taskCoreService.updateTask(id, updateTaskDto, empId);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_DELETE)
    @Post('delete/:id')
    async deleteTask(@Param('id') id: string) {
        return this.taskCoreService.deleteTask(id);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('get-emp-tasks')
    async getEmpTasks(@GetAccount() userId) {
        return this.taskQueryService.getEmpTasks(userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('get-project-tasks/:projectId')
    async getProjectTasks(@Param('projectId') projectId, @GetAccount() empId) {
        return this.taskQueryService.getProjectTasks(projectId, empId);
    }

    @Post('get-project-tasks-by-dept')
    async getProjectTasksByDept(
        @Body() body: { project_id: string; department_id: string },
    ): Promise<any> {
        const { project_id, department_id } = body;
        if (!project_id || !department_id) {
            throw new BadRequestException('Project ID and Department ID are required');
        }

        try {
            const tasks = await this.taskQueryService.getTaskProjectByDepartmentId(project_id, department_id);
            return tasks;
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to fetch tasks');
        }
    }

    @Roles(UserRole.ADMIN)
    @Get('get-all-tasks')
    async getAllTasks() {
        return this.taskCoreService.getAllTasks();
    }

    // @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    // @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    // @Post('update-status/:taskId')
    // async updateTaskStatus(
    //     @Param('taskId') taskId: string,
    //     @GetAccount() userId: string,
    //     @Body('newStatus') newStatus: TASK_STATUS,
    // ) {
    //     return this.taskStatusService.updateTaskStatus(taskId, userId, newStatus);
    // }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('add-subtask/:taskId')
    async addSubtask(
        @Param('taskId') taskId: string,
        @Body() createTaskDto: CreateSubTaskDto,
        @GetAccount() userId,
        @GetDepartment() departmentId,
    ) {
        createTaskDto.assignee = userId;
        return this.taskSubtaskService.addSubtask(taskId, createTaskDto);
    }



    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('weekly-tasks')
    async getWeeklyTasks(@GetAccount() userId: string) {
        return this.taskQueryService.getWeeklyTasks(userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('monthly-tasks')
    async getMonthlyTasks(@GetAccount() userId: string) {
        return this.taskQueryService.getMonthlyTasks(userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('on-test-tasks')
    async getOnTestTasks(@GetDepartment() departmentId) {
        return this.taskQueryService.getOnTestTask(departmentId);
    }

    @Get('get-sub-tasks/:parentId')
    async getSubTaskByParentTask(@Param('parentId') parentId: string) {
        return this.taskSubtaskService.getSubTaskByParentTask(parentId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Get('start/:taskId')
    async startTask(@Param('taskId') taskId: string, @GetAccount() userId: string) {
        return this.taskTimeTrackingService.startTask(taskId, userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Get('pause/:taskId')
    async pauseTask(@Param('taskId') taskId: string, @GetAccount() userId: string) {
        return this.taskTimeTrackingService.pauseTask(taskId, userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Get('complete/:taskId')
    async completeTask(@Param('taskId') taskId: string, @GetAccount() userId: string) {
        return this.taskTimeTrackingService.completeTask(taskId, userId);
    }

    @Get('tree')
    async getTaskTree(@Query() treeDto: GetTreeDto, @GetAccount() empId: string, @Query('tasks-by-me') tasksByMe?: string) {
        // If tasks-by-me is true, filter tasks by current user
        if (tasksByMe === 'true') {
            return this.taskQueryService.buildFullTaskList(treeDto, empId, true);
        }
        return this.taskQueryService.buildFullTaskList(treeDto, empId);
    }

    @Get('can-complete/:taskId')
    async canCompleteTask(@Param('taskId') taskId: string) {
        return this.taskSubtaskService.canCompleteTask(taskId);
    }
}