import { Controller, Post, Body, Param } from '@nestjs/common';
import { CreateTaskStatusDto } from './dto/create-task-status.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { Get, UseGuards } from '@nestjs/common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TaskStatusService } from './task-stauts.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('task-status')
export class TaskStatusController {
    constructor(private readonly taskStatusService: TaskStatusService) { }

    @Post('create')
    async create(@Body() createTaskStatusDto: CreateTaskStatusDto) {
        return this.taskStatusService.create(createTaskStatusDto);
    }

    @Get('find-all')
    async findAll() {
        return this.taskStatusService.findAll();
    }

    @Get('find-one/:id')
    async findOne(@Param('id') id: string) {
        return this.taskStatusService.findOne(id);
    }

    @Post('update/:id')
    async update(
        @Param('id') id: string,
        @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    ) {
        return this.taskStatusService.update(id, updateTaskStatusDto);
    }

    @Get('remove/:id')
    async remove(@Param('id') id: string) {
        return this.taskStatusService.remove(id);
    }
}
