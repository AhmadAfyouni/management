import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmpService } from '../emp/emp.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { Task, TaskDocument } from './schema/task.schema';

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
    ) { }

    async createTaskForDepartment(createTaskDto: CreateTaskDto) {
        if (!createTaskDto.department_id) {
            throw new BadRequestException('Department ID is required');
        }
        const emps = await this.empService.getEmpByDepartment(createTaskDto.department_id);
        if (!emps || emps.length === 0) {
            throw new NotFoundException('No employees found in this department');
        }

        const tasks = await Promise.all(
            emps.map(async (emp) => {
                const taskData = {
                    ...createTaskDto,
                    emp: emp.id,
                    department_id: createTaskDto.department_id,
                };

                const task = new this.taskModel(taskData);
                return await task.save();
            })
        );
        return tasks;
    }

    async getRecurringTasks(): Promise<TaskDocument[]> {
        const today = new Date();
        return this.taskModel.find({
            isRecurring: true,
            end_date: { $gte: today },
        }).exec();
    }

    async create(createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            if (!createTaskDto.emp) {
                throw new BadRequestException('Employee ID is required');
            }
            const emp = await this.empService.findDepartmentIdByEmpId(createTaskDto.emp);
            const task = new this.taskModel({
                ...createTaskDto,
                department_id: emp?.department_id,
            });
            await task.save();
            return { status: true, message: 'Task created successfully', data: task };
        } catch (error) {
            throw new InternalServerErrorException('Failed to create Task');
        }
    }


    async getTasks(departmentId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ department_id: departmentId })
                .populate({
                    path: "emp",
                    model: "Emp",
                    populate: [
                        {
                            path: "job_id",
                            model: "JobTitles",
                            populate: {
                                path: "category",
                                model: "JobCategory",
                            },
                        },
                        {
                            path: "department_id",
                            model: "Department",
                        }
                    ],
                })
                .populate('section_id')  // populate section information
                .populate('subtasks')     // populate subtasks if needed
                .exec();
            const tasksDto = tasks.map(task => new GetTaskDto(task));
            return { status: true, message: 'Tasks retrieved successfully', data: tasksDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }

    async getTaskById(id: string): Promise<{ status: boolean, message: string, data?: GetTaskDto }> {
        try {
            const task = await this.taskModel.findById(id)
                .populate({
                    path: "emp",
                    model: "Emp",
                    populate: {
                        path: "job_id",
                        model: "JobTitles",
                    },
                })
                .populate('section_id')
                .populate('subtasks')
                .exec();
            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }
            const taskDto = new GetTaskDto(task);
            return { status: true, message: 'Task retrieved successfully', data: taskDto };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve task');
        }
    }

    async updateTask(id: string, updateTaskDto: any): Promise<{ status: boolean, message: string }> {
        try {
            const updatedTask = await this.taskModel.findByIdAndUpdate(id, updateTaskDto, { new: true }).exec();
            if (!updatedTask) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }
            return { status: true, message: 'Task updated successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task', error.message);
        }
    }

    async deleteTask(id: string): Promise<{ status: boolean, message: string }> {
        try {
            const result = await this.taskModel.findByIdAndDelete(id).exec();
            if (!result) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }
            return { status: true, message: 'Task deleted successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to delete task');
        }
    }

    async getEmpTasks(empId: string): Promise<{ status: boolean, message: string, data?: GetTaskDto[] }> {
        const tasks = await this.taskModel.find({ emp: empId })
            .populate({
                path: "emp",
                model: "Emp",
                populate: [
                    {
                        path: "job_id",
                        model: "JobTitles",
                        populate: {
                            path: "category",
                            model: "JobCategory",
                        },
                    },
                    {
                        path: "department_id",
                        model: "Department",
                    },
                ],
            })
            .populate('section_id')
            .populate('subtasks')
            .lean()
            .exec();
        const taskDto = tasks.map((task) => new GetTaskDto(task));
        return { status: true, message: 'Tasks retrieved successfully', data: taskDto };
    }

    async startTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findOne({ _id: taskId, emp: userId, status: TASK_STATUS.PENDING });
        if (!task) throw new NotFoundException('Task not found or already completed');

        if (task.startTime) throw new BadRequestException('Task is already started');

        task.startTime = new Date();
        task.timeLogs.push({ start: task.startTime, end: undefined });
        await task.save();
        return { status: true, message: 'Task started successfully' };
    }

    async pauseTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findOne({ _id: taskId, emp: userId, status: TASK_STATUS.PENDING });
        if (!task || !task.startTime) throw new BadRequestException('Task is not started');

        const now = new Date();
        const timeDiff = Math.floor((now.getTime() - task.startTime.getTime()) / 60000);
        task.totalTimeSpent += timeDiff;

        const lastLog = task.timeLogs[task.timeLogs.length - 1];
        if (lastLog) lastLog.end = now;

        task.startTime = undefined;
        await task.save();
        return { status: true, message: 'Task paused successfully' };
    }

    async completeTask(taskId: string, userId: string): Promise<{ status: boolean, message: string, finalTime: number }> {
        const task = await this.taskModel.findOne({ _id: taskId, emp: userId });
        if (!task) throw new NotFoundException('Task not found');

        if (task.startTime) await this.pauseTask(taskId, userId);

        task.status = TASK_STATUS.DONE;
        await task.save();
        return { status: true, message: 'Task completed successfully', finalTime: task.totalTimeSpent };
    }

}
