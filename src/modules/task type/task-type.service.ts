import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import { UpdateTaskTypeDto } from './dto/update-task-type.dto';
import { GetTaskTypeDto } from './dto/get-task-type.dto';
import { TaskType, TaskTypeDocument } from './schema/task.-type.schema';

@Injectable()
export class TaskTypeService {
  constructor(
    @InjectModel(TaskType.name) private taskTypeModel: Model<TaskTypeDocument>,
  ) { }

  async create(createTaskTypeDto: CreateTaskTypeDto): Promise<{ status: boolean, message: string, data?: GetTaskTypeDto }> {
    try {
      const newTaskType = new this.taskTypeModel(createTaskTypeDto);
      const savedTaskType = await newTaskType.save();
      return { status: true, message: 'Task Type created successfully', data: new GetTaskTypeDto(savedTaskType) };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create Task Type');
    }
  }

  async findAll(): Promise<{ status: boolean, message: string, data: GetTaskTypeDto[] }> {
    try {
      const taskTypes = await this.taskTypeModel.find().exec();
      const taskTypesDto = taskTypes.map((taskType) => new GetTaskTypeDto(taskType));
      return { status: true, message: 'Task Types retrieved successfully', data: taskTypesDto };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve Task Types');
    }
  }

  async findOne(id: string): Promise<{ status: boolean, message: string, data: GetTaskTypeDto }> {
    try {
      const taskType = await this.taskTypeModel.findById(id).exec();
      if (!taskType) {
        throw new NotFoundException(`Task Type with ID ${id} not found`);
      }
      return { status: true, message: 'Task Type retrieved successfully', data: new GetTaskTypeDto(taskType) };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve Task Type');
    }
  }

  async update(id: string, updateTaskTypeDto: UpdateTaskTypeDto): Promise<{ status: boolean, message: string }> {
    try {
      const updatedTaskType = await this.taskTypeModel.findByIdAndUpdate(
        id,
        updateTaskTypeDto,
        { new: true },
      ).exec();

      if (!updatedTaskType) {
        throw new NotFoundException(`Task Type with ID ${id} not found`);
      }
      return { status: true, message: 'Task Type updated successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update Task Type');
    }
  }

  async remove(id: string): Promise<{ status: boolean, message: string }> {
    try {
      const result = await this.taskTypeModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`Task Type with ID ${id} not found`);
      }
      return { status: true, message: 'Task Type deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete Task Type');
    }
  }
}
