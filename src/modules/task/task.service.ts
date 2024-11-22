import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmpService } from '../emp/emp.service';
import { ProjectService } from '../project/project.service';
import { SectionService } from '../section/section.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { Task, TaskDocument } from './schema/task.schema';

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
        private readonly sectionService: SectionService,
        @Inject(forwardRef(() => ProjectService))
        private readonly projectService: ProjectService,
    ) { }
    private async paginate(query: any, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const total = await this.taskModel.countDocuments(query).exec();
        const data = await this.taskModel
            .find(query)
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();
        return {
            data,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        };
    }
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
            emp: manager!._id,
            department_id: createTaskDto.department_id,
        };

        const task = new this.taskModel(taskData);
        return await task.save();
    }

    async createTaskForProject(createTaskDto: CreateTaskDto) {
        if (!createTaskDto.project_id) {
            throw new BadRequestException('Project ID is required');
        }
        const project = await this.projectService.getProjectById(createTaskDto.project_id);
        await this.sectionService.createInitialSections(undefined, createTaskDto.project_id);
        const section_id = await this.sectionService.getRecentlySectionId(null, createTaskDto.project_id);
        createTaskDto.section_id = section_id;
        if (!project) {
            throw new NotFoundException('Project not found');
        }
        const task = new this.taskModel(createTaskDto);
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
            console.log(createTaskDto);
            if (!createTaskDto.emp) {
                throw new BadRequestException('Employee ID is required');
            }
            const departmentId = await this.empService.findDepartmentIdByEmpId(createTaskDto.emp);
            if (!departmentId) {
                throw new NotFoundException('Department Id not found for this employee');
            }
            await this.sectionService.createInitialSections(departmentId);
            const section_id = await this.sectionService.getRecentlySectionId(departmentId);
            createTaskDto.section_id = section_id;
            const task = new this.taskModel({
                ...createTaskDto,
                department_id: departmentId,
            });
            await task.save();
            return { status: true, message: 'Task created successfully', data: task };
        } catch (error) {
            throw new InternalServerErrorException('Failed to create Task', error.message);
        }
    }

    async getAllTasks(): Promise<{ status: boolean, message: string, data: any[] }> {
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
                .populate("department_id")
                .populate("assignee")
                .populate({
                    path: 'subtasks',
                    model: "Task",
                    populate: [
                        {
                            path: "department_id",
                            model: "Department",
                        },
                        {
                            path: "assignee",
                            model: "Emp",
                        },
                        {
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
                        }
                    ],
                }).lean()
                .exec();
            const tasksDto = tasks.map(task => new GetTaskDto(task));
            return { status: true, message: 'Tasks retrieved successfully', data: tasksDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }
    async getTasksByDepartmentId(departmentId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ department_id: departmentId, project_id: null })
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
                .populate("department_id")
                .populate("assignee")
                .populate({
                    path: 'subtasks',
                    model: "Task",
                    populate: [
                        {
                            path: "department_id",
                            model: "Department",
                        },
                        {
                            path: "assignee",
                            model: "Emp",
                        },
                        {
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
                        }
                    ],
                }).lean()
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
                .populate("department_id")
                .populate("assignee")
                .populate({
                    path: 'subtasks',
                    model: "Task",
                    populate: [
                        {
                            path: "department_id",
                            model: "Department",
                        },
                        {
                            path: "assignee",
                            model: "Emp",
                        },
                        {
                            path: "emp",
                            model: "Emp"
                        }
                    ],
                }).lean()
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

    async updateTask(
        id: string,
        updateTaskDto: UpdateTaskDto
    ): Promise<{ status: boolean; message: string }> {
        try {
            if (updateTaskDto.section_id) {
                const subTasks = await this.getSubTasksByParentTask(id);
                await Promise.all(
                    subTasks?.map(async (task) => {
                        task.section_id = updateTaskDto.section_id as any;
                        const updatedSubTask = await task.save();
                        if (!updatedSubTask) {
                            throw new NotFoundException(`Subtask with ID ${task._id} not found`);
                        }
                    })
                );
            }

            if (updateTaskDto.due_date) {
                const subTasks = await this.taskModel.find({
                    parent_task: id
                }).exec();
                console.log(subTasks);

                Promise.all(
                    subTasks.map(async (subTask) => {
                        if (new Date(subTask.due_date!) > new Date(updateTaskDto.due_date!)) {
                            subTask.due_date = updateTaskDto.due_date!;
                            await subTask.save();
                        }
                    })
                );

            }

            const updatedTask = await this.taskModel
                .findByIdAndUpdate(id, updateTaskDto, { new: true })
                .exec();

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

    async getProjectTasks(projectId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        const tasks = await this.taskModel.find({ project_id: projectId })
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
            .populate("assignee")
            .populate("department_id")
            .populate({
                path: 'subtasks',
                model: "Task",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                    },
                    {
                        path: "assignee",
                        model: "Emp",
                    },
                    {
                        path: "emp",
                        model: "Emp",
                    }
                ],
            }).lean()
            .lean()
            .exec();
        const taskDto = tasks.map((task) => new GetTaskDto(task));
        return { status: true, message: 'Tasks retrieved successfully', data: taskDto };
    }


    async getProjectTaskDetails(projectId: string) {
        const tasks = await this.taskModel.find({ project_id: projectId }).lean().exec();
        const newTask = tasks.map((task) => {
            return {
                ...task,
                is_over_due: task.due_date < new Date() && task.status !== TASK_STATUS.DONE
            }
        })
        return newTask;
    }

    async getTaskProjectByDepartmentId(projectId: string, departmentId: string,) {
        const tasks = await this.taskModel.find({ department_id: departmentId, project_id: projectId }).populate({
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
            .populate("assignee")
            .populate("department_id")
            .populate({
                path: 'subtasks',
                model: "Task",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                    },
                    {
                        path: "assignee",
                        model: "Emp",
                    },
                    {
                        path: "emp",
                        model: "Emp",
                    }
                ],
            }).lean()
            .lean()
            .exec();
        const taskDto = tasks.map((task) => new GetTaskDto(task));
        return taskDto;
    }

    async getEmpTasks(empId: string): Promise<{ status: boolean, message: string, data?: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ emp: empId, project_id: null })
                .populate({
                    path: "emp",
                    model: "Emp",
                    populate: [
                        {
                            path: "job_id",
                            model: "JobTitles",
                            populate: { path: "category", model: "JobCategory" },
                        },
                        { path: "department_id", model: "Department" },
                    ],
                })
                .populate("section_id")
                .populate("assignee")
                .populate("department_id")
                .populate({
                    path: "subtasks",
                    model: "Task",
                    populate: [
                        { path: "department_id", model: "Department" },
                        { path: "section_id", model: "Section" },
                        { path: "assignee", model: "Emp" },
                        {
                            path: "emp", model: "Emp", populate: [
                                {
                                    path: "job_id",
                                    model: "JobTitles",
                                    populate: { path: "category", model: "JobCategory" },
                                },
                                { path: "department_id", model: "Department" },
                            ],
                        },
                    ],
                })
                .lean()
                .exec();

            let subTaskDto;
            const taskDto = tasks.map((task) => {
                subTaskDto = (task.subtasks || []).map((subTask: any) => new GetTaskDto(subTask));
                return new GetTaskDto(task)
            });
            return { status: true, message: 'Tasks retrieved successfully', data: [...taskDto, ...(subTaskDto || [])] };
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return { status: false, message: "Failed to retrieve tasks", data: [] };
        }
    }


    async startTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findOne({
            _id: new Types.ObjectId(taskId),
            // emp: userId,
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
            // emp: new Types.ObjectId(userId),
        });

        if (!task) {
            throw new NotFoundException('Task not found or does not belong to the user');
        }

        if (!task.timeLogs.length) {
            throw new BadRequestException('No time logs found for this task');
        }

        const lastLog = task.timeLogs[task.timeLogs.length - 1];
        if (lastLog.end) {
            throw new BadRequestException('Task is already paused');
        }

        const now = new Date();
        lastLog.end = now;

        const timeDiffInMilliseconds = now.getTime() - lastLog.start.getTime();
        const timeDiffInMinutes = Math.round(timeDiffInMilliseconds / (1000)); // Convert ms to minutes

        task.totalTimeSpent = (task.totalTimeSpent || 0) + parseFloat(timeDiffInMinutes.toFixed(2)); // Keep 2 decimal places


        await task.save();

        return { status: true, message: 'Task paused successfully' };
    }

    async completeTask(taskId: string, userId: string): Promise<{ status: boolean, message: string, finalTime: number }> {
        const task = await this.taskModel.findOne({ _id: new Types.ObjectId(taskId) });
        if (!task) throw new NotFoundException('Task not found');

        const lastLog = task.timeLogs[task.timeLogs.length - 1];
        if (lastLog && !lastLog.end) await this.pauseTask(taskId, userId);

        task.status = TASK_STATUS.DONE;

        const now = new Date();
        let durationInSeconds;
        if (task.timeLogs.length > 0) {
            const firstLogStart = new Date(task.timeLogs[0].start).getTime();
            const nowTime = now.getTime();

            const durationInMilliseconds = nowTime - firstLogStart;
            durationInSeconds = Math.floor(durationInMilliseconds / 1000);
            console.log(`Time from first log's start to now: ${durationInSeconds} seconds`);
        } else {
            durationInSeconds = 0;
            console.log('No time logs available');
        }

        task.over_all_time = durationInSeconds.toString();
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
        try {
            const parentTask = await this.taskModel.findById(taskId);
            if (!parentTask) throw new NotFoundException('Parent task not found');

            createTaskDto.section_id = parentTask.section_id as any;

            if (createTaskDto.project_id && createTaskDto.department_id) {
                const emp = await this.empService.findManagerByDepartment(createTaskDto.department_id);
                createTaskDto.emp = emp!._id.toString();
                const project = await this.projectService.getProjectById(createTaskDto.project_id);
                if (!project) throw new NotFoundException('Project not found');

                await this.projectService.updateProject(createTaskDto.project_id, {
                    departments: [createTaskDto.department_id],
                });
            } else {
                createTaskDto.department_id = parentTask.department_id as any;
            }

            const subtask = new this.taskModel({
                ...createTaskDto,
                status: TASK_STATUS.PENDING,
                parent_task: parentTask._id.toString(),
            });

            await subtask.save();

            parentTask.subtasks.push(subtask._id);
            await parentTask.save();

            return {
                status: true,
                message: 'Subtask added successfully',
                data: subtask,
            };
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to add subtask');
        }
    }


    async getSubTasksByParentTask(parent_id: string): Promise<TaskDocument[]> {
        const subTasks = await this.taskModel.find({ parent_task: parent_id }).exec();
        return subTasks;
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

    async getWeeklyTasks(userId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const weeklyTasks = await this.taskModel.find({
            emp: userId,
            createdAt: { $gte: startOfWeek, $lte: today },
        }).populate({
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
            .populate("assignee")
            .populate("department_id")
            .populate({
                path: 'subtasks',
                model: "Task",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                    },
                    {
                        path: "assignee",
                        model: "Emp",
                    },
                    {
                        path: "emp",
                        model: "Emp",
                    }
                ],
            }).lean()
            .lean()
            .exec();
        const taskDto = weeklyTasks.map((task) => new GetTaskDto(task));

        return { status: true, message: 'Weekly tasks retrieved successfully', data: taskDto };
    }

    async getMonthlyTasks(userId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const monthlyTasks = await this.taskModel.find({
            emp: userId,
            createdAt: { $gte: startOfMonth, $lte: today },
        }).populate({
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
            .populate("assignee")
            .populate("department_id")
            .populate({
                path: 'subtasks',
                model: "Task",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                    },
                    {
                        path: "assignee",
                        model: "Emp",
                    },
                    {
                        path: "emp",
                        model: "Emp",
                    }
                ],
            }).lean()
            .lean()
            .exec();
        const taskDto = monthlyTasks.map((task) => new GetTaskDto(task));

        return { status: true, message: 'Monthly tasks retrieved successfully', data: taskDto };
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
            .populate("assignee")
            .populate({
                path: 'subtasks',
                model: "Task",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                    },
                    {
                        path: "assignee",
                        model: "Emp",
                    },
                    {
                        path: "emp",
                        model: "Emp",
                    }
                ],
            }).lean()
            .lean()
            .exec();
        const taskDto = tasks.map((task) => new GetTaskDto(task));

        return taskDto;
    }

    async buildTaskTree(empId: string): Promise<any> {
        const fullTree: any[] = [];
    
        const processTask = async (task: any, parentId: string | null = null) => {
            fullTree.push({
                id: task._id.toString(),
                name: task.name,
                parentId: parentId,
            });
    
            if (task.subtasks && task.subtasks.length > 0) {
                for (const subTask of task.subtasks) {
                    const fetchedSubTask = await this.taskModel
                        .findById(new Types.ObjectId(subTask._id))
                        .lean()
                        .exec();
    
                    if (fetchedSubTask) {
                        await processTask(fetchedSubTask, task._id.toString());
                    }
                }
            }
        };
    
        const tasks = await this.taskModel
            .find({ emp: new Types.ObjectId(empId), project_id: null })
            .lean()
            .exec();
    
        for (const task of tasks) {
            await processTask(task);
        }
    
        return fullTree; 
    }
    



    async getSubTaskByParentTask(parentId: string) {
        const tasks = await this.taskModel.find({ parent_task: parentId }).populate({
            path: "emp",
            model: "Emp",
            populate: [
                {
                    path: "job_id",
                    model: "JobTitles",
                    populate: { path: "category", model: "JobCategory" },
                },
                { path: "department_id", model: "Department" },
            ],
        })
            .populate("section_id")
            .populate("assignee")
            .populate("department_id")
            .populate({
                path: "subtasks",
                model: "Task",
                populate: [
                    { path: "department_id", model: "Department" },
                    { path: "section_id", model: "Section" },
                    { path: "assignee", model: "Emp" },
                    {
                        path: "emp", model: "Emp", populate: [
                            {
                                path: "job_id",
                                model: "JobTitles",
                                populate: { path: "category", model: "JobCategory" },
                            },
                            { path: "department_id", model: "Department" },
                        ],
                    },
                ],
            })
            .lean()
            .exec();
        return tasks.map((subTask) => new GetTaskDto(subTask));
    }
}