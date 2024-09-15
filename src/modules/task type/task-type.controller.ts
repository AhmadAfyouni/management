import { Controller, Post, Body, Param } from '@nestjs/common';
import { TaskTypeService } from './task-type.service';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/update-task-type.dto';
import { Get, UseGuards } from '@nestjs/common/decorators';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('task-type')
export class TaskTypeController {
    constructor(private readonly taskTypeService: TaskTypeService) {}

    @Post('create')
    async create(@Body() createTaskTypeDto: CreateTaskTypeDto) {
        return this.taskTypeService.create(createTaskTypeDto);
    }

    @Get('find-all')
    async findAll() {
        return this.taskTypeService.findAll();
    }

    @Get('find-one/:id')
    async findOne(@Param('id') id: string) {
        return this.taskTypeService.findOne(id);
    }

    @Post('update/:id')
    async update(
        @Param('id') id: string,
        @Body() updateTaskTypeDto: UpdateTaskTypeDto,
    ) {
        return this.taskTypeService.update(id, updateTaskTypeDto);
    }

    @Get('remove/:id')
    async remove(@Param('id') id: string) {
        return this.taskTypeService.remove(id);
    }
}
