import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaskStatus, TaskStatusDocument } from './schema/task-status.schema';
import { CreateTaskStatusDto } from './dto/create-task-status.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { GetTaskStatusDto } from './dto/get-task-status.dto';

@Injectable()
export class TaskStatusService {
  constructor(
    @InjectModel(TaskStatus.name) private taskStatusModel: Model<TaskStatusDocument>,
  ) { }

  async create(createTaskStatusDto: CreateTaskStatusDto): Promise<{ status: boolean, message: string, data?: GetTaskStatusDto }> {
    try {
      const newTaskStatus = new this.taskStatusModel(createTaskStatusDto);
      const savedTaskStatus = await newTaskStatus.save();
      return { status: true, message: 'TaskStatus created successfully', data: new GetTaskStatusDto(savedTaskStatus) };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create TaskStatus');
    }
  }

  async findAll(): Promise<{ status: boolean, message: string, data: GetTaskStatusDto[] }> {
    try {
      const taskStatuses = await this.taskStatusModel.find().exec();
      const taskStatusDto = taskStatuses.map(taskStatus => new GetTaskStatusDto(taskStatus));
      return { status: true, message: 'TaskStatuses retrieved successfully', data: taskStatusDto };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve TaskStatuses');
    }
  }

  async findOne(id: string): Promise<{ status: boolean, message: string, data: GetTaskStatusDto }> {
    try {
      const taskStatus = await this.taskStatusModel.findById(id).exec();
      if (!taskStatus) {
        throw new NotFoundException(`TaskStatus with ID ${id} not found`);
      }
      return { status: true, message: 'TaskStatus retrieved successfully', data: new GetTaskStatusDto(taskStatus) };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve TaskStatus');
    }
  }

  async update(id: string, updateTaskStatusDto: UpdateTaskStatusDto): Promise<{ status: boolean, message: string }> {
    try {
      const updatedTaskStatus = await this.taskStatusModel.findByIdAndUpdate(
        id,
        updateTaskStatusDto,
        { new: true },
      ).exec();

      if (!updatedTaskStatus) {
        throw new NotFoundException(`TaskStatus with ID ${id} not found`);
      }
      return { status: true, message: 'TaskStatus updated successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update TaskStatus');
    }
  }

  async remove(id: string): Promise<{ status: boolean, message: string }> {
    try {
      const result = await this.taskStatusModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`TaskStatus with ID ${id} not found`);
      }
      return { status: true, message: 'TaskStatus deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete TaskStatus');
    }
  }
}
