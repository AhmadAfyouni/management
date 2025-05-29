import { Controller, Get, Param, Body, UseGuards, Req, Post, BadRequestException, Query, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TasksService } from './task.service';
import { EnhancedTasksService } from './enhanced-task.service';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { GetTreeDto } from './dtos/get-tree.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
    constructor(
        private readonly taskService: TasksService,
        private readonly enhancedTaskService: EnhancedTasksService
    ) { }

    // ===============================
    // ORIGINAL TASK METHODS
    // ===============================

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
    async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @GetAccount() empId) {
        return this.taskService.updateTask(id, updateTaskDto, empId);
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
    async getProjectTasks(@Param("projectId") projectId, @GetAccount() empId) {
        return this.taskService.getProjectTasks(projectId, empId);
    }

    @Post('get-project-tasks-by-dept')
    async getProjectTasksByDept(
        @Body() body: { project_id: string; department_id: string }
    ): Promise<any> {
        const { project_id, department_id } = body;
        if (!project_id || !department_id) {
            throw new BadRequestException('Project ID and Department ID are required');
        }

        try {
            const tasks = await this.taskService.getTaskProjectByDepartmentId(project_id, department_id);
            return tasks;
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to fetch tasks');
        }
    }

    @Roles(UserRole.ADMIN)
    @Get("get-all-tasks")
    async getAllTasks() {
        return this.taskService.getAllTasks();
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('add-subtask/:taskId')
    async addSubtask(@Param('taskId') taskId: string, @Body() createTaskDto: CreateTaskDto, @GetAccount() userId, @GetDepartment() departmentId) {
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
    async getTaskTree(@Query() treeDto: GetTreeDto, @GetAccount() empId: string) {
        return this.taskService.buildFullTaskList(treeDto, empId);
    }

    @Get("can-complete/:taskId")
    async canCompleteTask(@Param('taskId') taskId: string) {
        return this.taskService.canCompleteTask(taskId);
    }

    // ===============================
    // ENHANCED TASK METHODS
    // ===============================

    /**
     * Enhanced task creation with validation and automatic estimation
     */
    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('enhanced/create')
    async createEnhancedTask(@Body() createTaskDto: CreateTaskDto, @GetAccount() userId) {
        createTaskDto.emp = userId;
        createTaskDto.assignee = userId;
        return this.enhancedTaskService.createTaskWithEnhancements(createTaskDto);
    }

    /**
     * Enhanced subtask creation with validation
     */
    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('enhanced/create-subtask/:parentTaskId')
    async createEnhancedSubtask(
        @Param('parentTaskId') parentTaskId: string,
        @Body() createTaskDto: CreateTaskDto,
        @GetAccount() userId: string
    ) {
        createTaskDto.emp = userId;
        createTaskDto.assignee = userId;
        return this.enhancedTaskService.createSubtaskWithValidation(parentTaskId, createTaskDto);
    }

    /**
     * Enhanced task status update with validation rules
     */
    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Put('enhanced/status/:taskId')
    async updateEnhancedTaskStatus(
        @Param('taskId') taskId: string,
        @Body('status') newStatus: TASK_STATUS,
        @GetAccount() empId: string
    ) {
        return this.enhancedTaskService.updateTaskStatusWithValidation(taskId, newStatus, empId);
    }

    /**
     * Log time to a task
     */
    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Post('enhanced/log-time/:taskId')
    async logTimeToTask(
        @Param('taskId') taskId: string,
        @Body('hours') hours: number,
        @GetAccount() empId: string
    ) {
        return this.enhancedTaskService.logTimeToTask(taskId, hours, empId);
    }

    /**
     * Get tasks in flat list format with section information
     */
    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('enhanced/flat-list')
    async getTasksFlatList(@Query() filters: any) {
        return this.enhancedTaskService.getTasksFlatList(filters);
    }

    /**
     * Update task board position for Kanban customization
     */
    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_UPDATE)
    @Put('enhanced/board-position/:taskId')
    async updateTaskBoardPosition(
        @Param('taskId') taskId: string,
        @Body() body: { sectionId: string; boardOrder: number },
        @GetAccount() empId: string
    ) {
        const { sectionId, boardOrder } = body;
        return this.enhancedTaskService.updateTaskBoardPosition(taskId, sectionId, boardOrder, empId);
    }

    /**
     * Get tasks organized by board sections for Kanban view
     */
    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('enhanced/board-sections')
    async getTasksByBoardSections(@Query() filters: any) {
        return this.enhancedTaskService.getTasksByBoardSections(filters);
    }
}
