import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TasksService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Permissions, Role } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly taskService: TasksService) { }
    
    
    @Post('create')
    async createTask(@Body() createTaskDto: CreateTaskDto) {
        return this.taskService.create(createTaskDto);
    }
    @Post('create-task-department')
    async createTaskForDepartment(@Body() createTaskDto: CreateTaskDto) {
        return this.taskService.createTaskForDepartment(createTaskDto);
    }
    @Get("get-tasks")
    async getAllTasks() {
        return this.taskService.getTasks();
    }

    @Get('task/:id')
    async getTaskById(@Param('id') id: string) {
        return this.taskService.getTaskById(id);
    }

    @Post('update/:id')
    async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
        return this.taskService.updateTask(id, updateTaskDto);
    }

    @Post('delete/:id')
    async deleteTask(@Param('id') id: string) {
        return this.taskService.deleteTask(id);
    }

    @Get("get-emp-tasks")
    async getEmpTasks(@Req() req) {
        const userId = req.user.userId
        return this.taskService.getEmpTasks(userId);
    }
}
