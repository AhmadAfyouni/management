import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TasksService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { Department } from '../department/schema/department.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly taskService: TasksService) { }



    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create')
    async createTask(@Body() createTaskDto: CreateTaskDto) {
        return this.taskService.create(createTaskDto);
    }


    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('create-task-department')
    async createTaskForDepartment(@Body() createTaskDto: CreateTaskDto) {
        return this.taskService.createTaskForDepartment(createTaskDto);
    }


    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get("get-my-dept-tasks")
    async getMyDeptTasks(@GetDepartment() departmentId) {
        return this.taskService.getTasks(departmentId);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get("get-tasks-by-dept/:deptId")
    async getTaskByDept(@Param("deptId") departmentId) {
        return this.taskService.getTasks(departmentId);
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
}
