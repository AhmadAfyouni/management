import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { Task, TaskDocument } from './schema/task.schema';
import { EmpService } from '../emp/emp.service';
import { SectionService } from '../section/section.service';
import { NotificationService } from '../notification/notification.service';
import { TaskValidationService } from './task-validation.service';
import { Project, ProjectDocument } from '../project/schema/project.schema';

@Injectable()
export class TaskCoreService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        private readonly empService: EmpService,
        private readonly sectionService: SectionService,
        private readonly notificationService: NotificationService,
        private readonly taskValidationService: TaskValidationService,
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
        { path: "department_id" },
        { path: "project_id" }
    ];

    async createTaskForDepartment(createTaskDto: CreateTaskDto) {
        if (!createTaskDto.department_id) {
            throw new BadRequestException('Department ID is required');
        }

        const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
        if (!manager) {
            throw new NotFoundException("this department does not have manager");
        }

        await this.taskValidationService.autoCalculateEstimatedHours(createTaskDto);
        await this.taskValidationService.validateTaskDatesWithWorkingHours(createTaskDto);

        const section = await this.sectionService.createInitialSections(manager._id.toString()) as any;
        createTaskDto.section_id = section._id.toString();

        const taskData = {
            ...createTaskDto,
            emp: manager._id.toString(),
            department_id: createTaskDto.department_id,
        };

        const task = new this.taskModel(taskData);
        const savedTask = await task.save();

        await this.notificationService.notifyTaskCreated(
            savedTask,
            manager._id.toString(),
            savedTask.assignee?.toString()
        );

        return savedTask;
    }

    async createTaskForEmp(createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            if (!createTaskDto.emp) {
                throw new BadRequestException('Employee ID is required');
            }

            const departmentId = await this.empService.findDepartmentIdByEmpId(createTaskDto.emp);
            if (!departmentId) {
                throw new NotFoundException('Department ID not found for this employee');
            }

            await this.taskValidationService.autoCalculateEstimatedHours(createTaskDto);
            await this.taskValidationService.validateTaskDatesWithWorkingHours(createTaskDto);

            await this.sectionService.createInitialSections(createTaskDto.emp);
            const section_id = await this.sectionService.getRecentlySectionId(createTaskDto.emp);
            createTaskDto.section_id = section_id;

            const task = new this.taskModel({
                ...createTaskDto,
                department_id: departmentId,
            });
            const savedTask = await task.save();

            await this.notificationService.notifyTaskCreated(
                savedTask,
                createTaskDto.emp!,
                savedTask.assignee?.toString()
            );

            return { status: true, message: 'Task created successfully', data: savedTask };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create Task', error.message);
        }
    }

    async createTaskForProject(createTaskDto: CreateTaskDto): Promise<{ status: boolean; message: string; data?: Task }> {
        try {
            if (!createTaskDto.project_id) {
                throw new BadRequestException('Project ID is required');
            }
            if (!createTaskDto.department_id) {
                throw new BadRequestException('Department ID is required');
            }
            const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
            if (!manager) {
                throw new NotFoundException("this department does not have manager");
            }


            // Validate project existence
            const project = await this.projectModel.findById(createTaskDto.project_id);
            if (!project) {
                throw new NotFoundException(`Project with ID ${createTaskDto.project_id} not found`);
            }
            await this.taskValidationService.validateTaskDatesAgainstProject(createTaskDto, project);

            // Check if employee's department is part of the project
            if (!project.departments.map((dept) => dept.toString()).includes(createTaskDto.department_id)) {
                throw new ForbiddenException('Employee’s department is not associated with this project');
            }

            // Validate task data
            await this.taskValidationService.autoCalculateEstimatedHours(createTaskDto);
            await this.taskValidationService.validateTaskDatesWithWorkingHours(createTaskDto);

            // Assign section
            await this.sectionService.createInitialSections(manager._id.toString());
            const section_id = await this.sectionService.getRecentlySectionId(manager._id.toString());
            createTaskDto.section_id = section_id;

            // Create task
            const task = new this.taskModel({
                ...createTaskDto,
                department_id: createTaskDto.department_id,
                project_id: new Types.ObjectId(createTaskDto.project_id),
            });
            const savedTask = await task.save();

            // Send notification
            await this.notificationService.notifyTaskCreated(
                savedTask,
                manager._id.toString(),
                savedTask.assignee?.toString(),
            );

            return { status: true, message: 'Task created successfully for project', data: savedTask };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create task for project', error.message);
        }
    }

    async getAllTasks(): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({})
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const tasksDto = tasks.map(task => new GetTaskDto(task));
            return { status: true, message: 'Tasks retrieved successfully', data: tasksDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }

    async getTaskById(id: string): Promise<{ status: boolean, message: string, data?: any }> {
        try {
            const task = await this.taskModel.findById(id)
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            const subtasks = await this.fetchSubtasksRecursively(id);
            const taskWithSubtasks = { ...task, subtasks };
            // const taskDto = new GetTaskDto(taskWithSubtasks);

            return { status: true, message: 'Task retrieved successfully', data: taskWithSubtasks };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve task', error.message);
        }
    }

    private async fetchSubtasksRecursively(parentId: string): Promise<any[]> {
        const subtasks = await this.taskModel.find({ parent_task: parentId })
            .populate(this.defaultPopulateOptions)
            .lean()
            .exec();

        const results = await Promise.all(
            subtasks.map(async (subtask) => {
                const childSubtasks = await this.fetchSubtasksRecursively(subtask._id.toString());
                return { ...subtask, subtasks: childSubtasks };
            })
        );

        return results;
    }

    async updateTask(id: string, updateTaskDto: UpdateTaskDto, empId: string): Promise<{ status: boolean; message: string }> {
        try {
            const task = await this.taskModel.findById(new Types.ObjectId(id))
                .populate('project_id')
                .exec();

            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            const oldStatus = task.status;
            await this.taskValidationService.validateTaskUpdate(task, updateTaskDto, empId);

            const updatedTask = await this.taskModel
                .findByIdAndUpdate(id, updateTaskDto, { new: true })
                .exec();

            if (!updatedTask) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            if (updateTaskDto.status && oldStatus !== updateTaskDto.status) {
                await this.notificationService.notifyTaskStatusChanged(updatedTask, empId);
            }

            return { status: true, message: 'Task updated successfully' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
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
}