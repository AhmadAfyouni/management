import { Controller, Post, Body, Param } from '@nestjs/common';
import { TaskTypeService } from './task-type.service';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/update-task-type.dto';
import { Get, UseGuards } from '@nestjs/common/decorators';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequiredPermissions } from 'src/common/decorators/role.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('task-type')
export class TaskTypeController {
    constructor(private readonly taskTypeService: TaskTypeService) {}

    @Post('create')
    // @Permissions("taskType:create")
    async create(@Body() createTaskTypeDto: CreateTaskTypeDto) {
        return this.taskTypeService.create(createTaskTypeDto);
    }

    @Get('find-all')
    // @Permissions("taskType:view-all")
    async findAll() {
        return this.taskTypeService.findAll();
    }

    @Get('find-one/:id')
    // @Permissions("taskType:view")
    async findOne(@Param('id') id: string) {
        return this.taskTypeService.findOne(id);
    }

    @Post('update/:id')
    // @Permissions("taskType:update")
    async update(
        @Param('id') id: string,
        @Body() updateTaskTypeDto: UpdateTaskTypeDto,
    ) {
        return this.taskTypeService.update(id, updateTaskTypeDto);
    }

    @Get('remove/:id')
    // @Permissions("taskType:remove")
    async remove(@Param('id') id: string) {
        return this.taskTypeService.remove(id);
    }
}
