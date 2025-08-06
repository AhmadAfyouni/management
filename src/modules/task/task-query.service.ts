import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GetTaskDto } from './dtos/get-task.dto';
import { GetTreeDto } from './dtos/get-tree.dto';
import { Task, TaskDocument } from './schema/task.schema';
import { Section, SectionDocument } from '../section/schemas/section.schema';
import path from 'path';

@Injectable()
export class TaskQueryService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
    ) { }

    private readonly defaultPopulateOptions = [
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
                },
            ],
        },
        {
            path: "assignee",
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
        },
        { path: "section_id" },
        { path: "manager_section_id" },
        { path: "department_id" },
        { path: "project_id" },
        { path: "sub_tasks" }
    ];

    /**
     * Helper method to validate and fix section_id for tasks based on employee's available sections
     */
    private async validateAndFixTaskSections(tasks: any[], empId: string): Promise<any[]> {
        try {
            // Fetch all sections for the employee
            const userSections = await this.sectionModel.find({ emp: empId }).lean().exec();

            if (!userSections || userSections.length === 0) {
                // If no sections found, return tasks as is
                return tasks;
            }

            const userSectionIds = userSections.map((s: any) => s._id.toString());
            const firstSectionId = userSections[0] as any;

            // Process each task
            return tasks.map(task => {
                if (task.section_id && !userSectionIds.includes(task.section_id._id?.toString() || task.section_id.toString())) {
                    // If section_id is not for this user, set to firstSectionId
                    task.section_id = firstSectionId;
                }
                return task;
            });
        } catch (error) {
            console.error('Error validating task sections:', error);
            return tasks; // Return original tasks if validation fails
        }
    }

    /**
     * Helper method to convert tasks to DTOs with section validation
     */
    private async convertTasksToDto(tasks: any[], empId: string): Promise<GetTaskDto[]> {
        const validatedTasks = await this.validateAndFixTaskSections(tasks, empId);

        return validatedTasks
            .filter(task => task && task._id)
            .map((task) => {
                try {
                    return new GetTaskDto(task);
                } catch (error) {
                    console.error(`Error creating GetTaskDto for task ${task._id}:`, error);
                    return null;
                }
            })
            .filter(task => task !== null);
    }

    async paginate(query: any, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [total, data] = await Promise.all([
            this.taskModel.countDocuments(query).exec(),
            this.taskModel
                .find(query)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec()
        ]);

        return {
            data,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getTasksByDepartmentId(departmentId: string, empId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ department_id: departmentId, project_id: null })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const tasksDto = await this.convertTasksToDto(tasks, empId);
            return { status: true, message: 'Tasks retrieved successfully', data: tasksDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }

    async getProjectTasks(projectId: string, empId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ project_id: projectId })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDto = await this.convertTasksToDto(tasks, empId);
            return { status: true, message: 'Tasks retrieved successfully', data: taskDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve project tasks', error.message);
        }
    }

    async getProjectTaskDetails(projectId: string, empId: string) {
        try {
            const objectId = new Types.ObjectId(projectId);
            const tasks = await this.taskModel.find({ project_id: objectId }).lean().exec();

            const tasksWithOverdue = tasks.map((task) => ({
                ...task,
                is_over_due: task.due_date < new Date() && task.status !== 'DONE'
            }));

            return await this.validateAndFixTaskSections(tasksWithOverdue, empId);
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve project task details', error.message);
        }
    }

    async getTaskProjectByDepartmentId(projectId: string, departmentId: string, empId: string) {
        try {
            const { info } = await this.buildFullTaskList({ projectId, departmentId }, empId);
            return info;
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve project tasks by department', error.message);
        }
    }

    async getEmpTasks(empId: string): Promise<{ status: boolean, message: string, data?: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ emp: empId, project_id: null })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDto = await this.convertTasksToDto(tasks, empId);
            return { status: true, message: 'Tasks retrieved successfully', data: taskDto };
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return { status: false, message: "Failed to retrieve tasks", data: [] };
        }
    }

    async getWeeklyTasks(userId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());

            const weeklyTasks = await this.taskModel.find({
                emp: userId,
                project_id: null,
                createdAt: { $gte: startOfWeek, $lte: today },
            })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDto = await this.convertTasksToDto(weeklyTasks, userId);
            return { status: true, message: 'Weekly tasks retrieved successfully', data: taskDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve weekly tasks', error.message);
        }
    }

    async getMonthlyTasks(userId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const monthlyTasks = await this.taskModel.find({
                emp: userId,
                project_id: null,
                createdAt: { $gte: startOfMonth, $lte: today },
            })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDto = await this.convertTasksToDto(monthlyTasks, userId);
            return { status: true, message: 'Monthly tasks retrieved successfully', data: taskDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve monthly tasks', error.message);
        }
    }

    async getOnTestTask(department_id: string, empId: string): Promise<GetTaskDto[]> {
        try {
            const tasks = await this.taskModel.find({ department_id, status: 'ON_TEST' })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            return await this.convertTasksToDto(tasks, empId);
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve on-test tasks', error.message);
        }
    }

    async getTaskById(taskId: string, empId: string): Promise<{ status: boolean, message: string, data?: GetTaskDto }> {
        try {
            const task = await this.taskModel.findById(taskId)
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            if (!task) {
                return { status: false, message: 'Task not found' };
            }
            const validatedTasks = await this.validateAndFixTaskSections([task], empId);
            const mainTask = validatedTasks[0];

            // Manually fetch sub_tasks as full objects and map to GetTaskDto
            let subTasks: any[] = [];
            if (mainTask && Array.isArray(mainTask.sub_tasks) && mainTask.sub_tasks.length > 0) {
                subTasks = await this.taskModel.find({ _id: { $in: mainTask.sub_tasks } })
                    .populate(this.defaultPopulateOptions)
                    .lean()
                    .exec();
            }

            const taskDto = new GetTaskDto({ ...mainTask, sub_tasks: subTasks });

            return { status: true, message: 'Task retrieved successfully', data: taskDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve task', error.message);
        }
    }

    async buildFullTaskList(treeDto: GetTreeDto, empId: string, filterByMe?: boolean): Promise<{ tree: any[], info: any[] }> {
        try {
            const query: any = { parent_task: null };

            if (filterByMe) {
                query.assignee = empId;
            } else if (treeDto.departmentId && treeDto.projectId) {
                query.department_id = treeDto.departmentId;
                query.project_id = new Types.ObjectId(treeDto.projectId);
            } else if (treeDto.projectId) {
                query.project_id = new Types.ObjectId(treeDto.projectId);
            } else if (treeDto.departmentId) {
                query.department_id = treeDto.departmentId;
                query.project_id = null;
            } else {
                query.emp = empId;
                query.project_id = null;
            }

            const parentTasks = await this.taskModel
                .find(query)
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDtos = await this.convertTasksToDto(parentTasks, empId);

            const fullList: any[] = [];

            for (const task of taskDtos) {
                await this.collectTasksRecursively(task!, fullList, empId);
            }

            return { tree: fullList, info: taskDtos };
        } catch (error) {
            console.error('Error in buildFullTaskList:', error);
            throw new InternalServerErrorException('Failed to build full task list', error.message);
        }
    }

    async collectTasksRecursively(task: GetTaskDto, fullList: any[], empId: string): Promise<void> {
        fullList.push({
            id: task.id,
            name: task.name,
            parentId: task.parent_task,
        });

        try {
            const subTasks = await this.taskModel
                .find({ parent_task: task.id })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const subTaskDtos = await this.convertTasksToDto(subTasks, empId);

            for (const subTask of subTaskDtos) {
                await this.collectTasksRecursively(subTask, fullList, empId);
            }

        } catch (error) {
            console.error(`Error processing subtasks for task ${task.id}:`, error);
        }
    }

    async getAllTasks(empId: string, isAdmin: boolean): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const query: any = {};
            query.$or = [{ emp: empId }, { assignee: empId }];

            const tasks = await this.taskModel.find(query)
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDtos = await this.convertTasksToDto(tasks, empId);
            return { status: true, message: 'All tasks retrieved successfully', data: taskDtos };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve all tasks', error.message);
        }
    }
}