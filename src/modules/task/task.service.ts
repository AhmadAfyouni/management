import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmpService } from '../emp/emp.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTaskDto } from './dto/get-task.dto';
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
                    emp: emp._id,
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

            const emp = await this.empService.findDepartmentIdByEmpId(createTaskDto.emp!);
            const task = new this.taskModel({ ...createTaskDto, department_id: emp?.department_id });
            await task.save();
            return { status: true, message: 'Task created successfully' };
        } catch (error) {
            throw new InternalServerErrorException('Failed to create Task');
        }
    }

    async getTasks(departmentId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({})
                .populate('task_type status')
                .populate({
                    path: "emp",
                    model: "Emp",
                    match: { department_id: departmentId },
                    populate: [
                        {
                            path: "job_id",
                            model: "JobTitles",
                            populate: {
                                path: "category",
                                model: "JobCategory",
                            }
                        },
                        {
                            path: "department_id",
                            model: "Department",
                        }
                    ],

                })
                .exec();
            const filteredTasks = tasks.filter(task => task.emp !== null);
            const tasksDto = filteredTasks.map(task => new GetTaskDto(task));

            return { status: true, message: 'Tasks retrieved successfully', data: tasksDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }


    async getTaskById(id: string): Promise<{ status: boolean, message: string, data?: GetTaskDto }> {
        try {
            const task = await this.taskModel.findById(id).populate('task_type status').populate('task_type status').populate({
                path: "emp",
                model: "Emp",
                populate: {
                    path: "job_id",
                    model: "JobTitles"
                }
            }).exec();
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
            console.log(error.message);
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

    async getEmpTasks(empId: string): Promise<GetTaskDto[]> {
        const tasks = await this.taskModel.find({ emp: empId }).populate('task_type status').populate({
            path: "emp",
            model: "Emp",
            populate: [
                {
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory",
                    }
                },
                {
                    path: "department_id",
                    model: "Department",

                }
            ]
        }).lean().exec();
        return tasks.map((task) => new GetTaskDto(task));
    }
}
