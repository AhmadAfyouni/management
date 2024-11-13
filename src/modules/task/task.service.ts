import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmpService } from '../emp/emp.service';
import { JobTitlesService } from '../job-titles/job-titles.service';
import { SectionService } from '../section/section.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { Task, TaskDocument } from './schema/task.schema';

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
        private readonly sectionService: SectionService,
    ) { }

    async createTaskForDepartment(createTaskDto: CreateTaskDto) {
        if (!createTaskDto.department_id) {
            throw new BadRequestException('Department ID is required');
        }
        await this.sectionService.createInitialSections(createTaskDto.department_id);
        const section_id = await this.sectionService.getRecentlySectionId(createTaskDto.department_id);
        createTaskDto.section_id = section_id;
        const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
        const taskData = {
            ...createTaskDto,
            emp: manager._id,
            department_id: createTaskDto.department_id,
        };

        const task = new this.taskModel(taskData);
        return await task.save();
    }

    async getRecurringTasks(): Promise<TaskDocument[]> {
        const today = new Date();
        return this.taskModel.find({
            isRecurring: true,
            end_date: { $gte: today },
        }).exec();
    }

    async createTaskForEmp(createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {

            if (!createTaskDto.emp) {
                throw new BadRequestException('Employee ID is required');
            }
            await this.sectionService.createInitialSections(createTaskDto.department_id);
            const section_id = await this.sectionService.getRecentlySectionId(createTaskDto.department_id);
            createTaskDto.section_id = section_id;
            const emp = await this.empService.findDepartmentIdByEmpId(createTaskDto.emp);
            const task = new this.taskModel({
                ...createTaskDto,
                department_id: emp?.department_id,
            });
            await task.save();
            return { status: true, message: 'Task created successfully', data: task };
        } catch (error) {
            throw new InternalServerErrorException('Failed to create Task', error.message);
        }
    }


    async getAllTasks(): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({})
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
                .populate('section_id')
                .populate('subtasks')
                .populate("assignee")
                .exec();
            const tasksDto = tasks.map(task => new GetTaskDto(task));
            return { status: true, message: 'Tasks retrieved successfully', data: tasksDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }
    async getTasksByDepartmentId(departmentId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
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
                .populate('section_id')
                .populate('subtasks')
                .populate("assignee")
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
                .populate("assignee")
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
            .populate("assignee")
            .lean()
            .exec();
        const taskDto = tasks.map((task) => new GetTaskDto(task));
        return { status: true, message: 'Tasks retrieved successfully', data: taskDto };
    }
    async startTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findOne({
            _id: new Types.ObjectId(taskId),
            emp: userId,
            status: TASK_STATUS.PENDING
        });
        if (!task) throw new NotFoundException('Task not found or already completed');

        const lastLog = task.timeLogs[task.timeLogs.length - 1];
        if (lastLog && !lastLog.end) throw new BadRequestException('Task is already started');

        task.timeLogs.push({ start: new Date(), end: undefined });
        await task.save();
        return { status: true, message: 'Task started successfully' };
    }

    async pauseTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findOne({
            _id: new Types.ObjectId(taskId),
            emp: userId,
            status: TASK_STATUS.PENDING
        });
        if (!task || !task.timeLogs.length || task.timeLogs[task.timeLogs.length - 1].end) {
            throw new BadRequestException('Task is not currently started or already paused');
        }

        const now = new Date();
        const lastLog = task.timeLogs[task.timeLogs.length - 1];
        lastLog.end = now;

        const timeDiff = Math.floor((now.getTime() - lastLog.start.getTime()) / 60000);
        task.totalTimeSpent += timeDiff;

        await task.save();
        return { status: true, message: 'Task paused successfully' };
    }

    async completeTask(taskId: string, userId: string): Promise<{ status: boolean, message: string, finalTime: number }> {
        const task = await this.taskModel.findOne({ _id: new Types.ObjectId(taskId), emp: userId });
        if (!task) throw new NotFoundException('Task not found');

        const lastLog = task.timeLogs[task.timeLogs.length - 1];
        if (lastLog && !lastLog.end) await this.pauseTask(taskId, userId);

        task.status = TASK_STATUS.DONE;
        await task.save();

        return { status: true, message: 'Task completed successfully', finalTime: task.totalTimeSpent };
    }


    async markAsComplete(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findOne({ _id: taskId, emp: userId });
        if (!task) throw new NotFoundException('Task not found');

        task.status = TASK_STATUS.DONE;
        await task.save();

        return { status: true, message: 'Task marked as complete successfully' };
    }

    async addSubtask(taskId: string, createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        const parentTask = await this.taskModel.findById(taskId);
        if (!parentTask) throw new NotFoundException('Parent task not found');
        await this.sectionService.createInitialSections(createTaskDto.department_id);
        const section_id = await this.sectionService.getRecentlySectionId(createTaskDto.department_id);
        createTaskDto.section_id = section_id;
        const subtask = new this.taskModel({ ...createTaskDto, status: TASK_STATUS.PENDING });
        await subtask.save();
        parentTask.subtasks.push(subtask._id);
        await parentTask.save();

        return { status: true, message: 'Subtask added successfully', data: subtask };
    }

    async updateTaskStatus(taskId: string, userId: string, newStatus: TASK_STATUS): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findById(taskId);
        if (!task) throw new NotFoundException('Task not found');
        switch (newStatus) {
            case TASK_STATUS.ON_TEST:
                task.status = TASK_STATUS.ON_TEST;
                break;
            case TASK_STATUS.DONE:
                if (task.assignee?.toString() !== userId || task.status !== TASK_STATUS.ON_TEST) {
                    throw new BadRequestException('Only the assignee can approve the task, and it must be in test status');
                }
                task.status = TASK_STATUS.DONE;
                break;

            case TASK_STATUS.ONGOING:
                task.status = TASK_STATUS.ONGOING;
                break;

            case TASK_STATUS.PENDING:
                task.status = TASK_STATUS.PENDING;
                break;

            default:
                throw new BadRequestException('Invalid status update');
        }

        await task.save();

        let message = `Task status updated to ${newStatus}`;

        return { status: true, message };
    }

    async updateDescription(taskId: string, newDescription: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findById(taskId);
        if (!task) throw new NotFoundException('Task not found');

        task.description = newDescription;
        await task.save();

        return { status: true, message: 'Task description updated successfully' };
    }

    async getWeeklyTasks(userId: string): Promise<{ status: boolean, message: string, data: TaskDocument[] }> {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const weeklyTasks = await this.taskModel.find({
            emp: userId,
            createdAt: { $gte: startOfWeek, $lte: today },
        }).exec();

        return { status: true, message: 'Weekly tasks retrieved successfully', data: weeklyTasks };
    }

    async getMonthlyTasks(userId: string): Promise<{ status: boolean, message: string, data: TaskDocument[] }> {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const monthlyTasks = await this.taskModel.find({
            emp: userId,
            createdAt: { $gte: startOfMonth, $lte: today },
        }).exec();

        return { status: true, message: 'Monthly tasks retrieved successfully', data: monthlyTasks };
    }

    async getOnTestTask(department_id: string) {
        const tasks = await this.taskModel.find({ department_id, status: TASK_STATUS.ON_TEST })
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
            .populate("assignee")
            .lean()
            .exec();
        return tasks;
    }
}
