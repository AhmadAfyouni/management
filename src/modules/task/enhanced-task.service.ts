import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmpService } from '../emp/emp.service';
import { NotificationService } from '../notification/notification.service';
import { ProjectService } from '../project/project.service';
import { SectionService } from '../section/section.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { RoutineTaskService } from '../routine-tasks/routine-task.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { GetTreeDto } from './dtos/get-tree.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { Task, TaskDocument } from './schema/task.schema';
import { ProgressCalculationMethod } from '../company-settings/schemas/company-settings.schema';
import { ProjectStatus } from '../project/enums/project-status';

/**
 * Enhanced Service responsible for managing tasks with new features
 */
@Injectable()
class EnhancedTasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
        private readonly sectionService: SectionService,
        @Inject(forwardRef(() => ProjectService))
        private readonly projectService: ProjectService,
        private readonly notificationService: NotificationService,
        private readonly companySettingsService: CompanySettingsService,
        private readonly routineTaskService: RoutineTaskService,
    ) { }

    /**
     * Common populate configuration for task queries
     */
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
        { path: "section_id" },
        { path: "department_id" },
        { path: "assignee" },
        { path: "project_id" },
        { path: "parent_task" },
        { path: "sub_tasks" },
        { path: "dependencies" },
        { path: "blocking" }
    ];

    /**
     * Enhanced task creation with validation and automatic estimation
     */
    async createTaskWithEnhancements(createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            // Validate task creation prerequisites
            await this.validateTaskCreationPrerequisites(createTaskDto);

            // Auto-calculate estimated hours if dates are provided
            if (createTaskDto.start_date && createTaskDto.expected_end_date) {
                const estimatedHours = await this.companySettingsService.calculateEstimatedHours(
                    new Date(createTaskDto.start_date),
                    new Date(createTaskDto.expected_end_date)
                );
                
                // Only set if not manually provided
                if (!createTaskDto.estimated_hours) {
                    createTaskDto.estimated_hours = estimatedHours;
                }
            }

            // Set progress calculation method from company settings
            const progressMethod = await this.companySettingsService.getProgressCalculationMethod();
            
            // Create task
            const task = new this.taskModel({
                ...createTaskDto,
                progressCalculationMethod: progressMethod,
                progress: 0,
                hasLoggedHours: false,
                isActive: true,
            });

            const savedTask = await task.save();

            // Update parent task's sub_tasks array if this is a subtask
            if (createTaskDto.parent_task) {
                await this.taskModel.findByIdAndUpdate(
                    createTaskDto.parent_task,
                    { $push: { sub_tasks: savedTask._id } }
                );
            }

            // Send notification
            await this.notificationService.notifyTaskCreated(
                savedTask,
                createTaskDto.emp!,
                savedTask.assignee?.toString()
            );

            return { status: true, message: 'Task created successfully', data: savedTask };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create enhanced task', error.message);
        }
    }

    /**
     * Validates task creation prerequisites based on the requirements
     */
    private async validateTaskCreationPrerequisites(createTaskDto: CreateTaskDto): Promise<void> {
        // Check if task is for a project
        if (createTaskDto.project_id) {
            // Must have at least one ongoing project
            const project = await this.projectService.getProjectById(createTaskDto.project_id);
            if (!project) {
                throw new BadRequestException('Project not found');
            }
            
            if (project.status !== ProjectStatus.IN_PROGRESS) {
                throw new BadRequestException('Project must be in ONGOING status to add tasks');
            }

            // Task dates must be within project timeline
            if (createTaskDto.start_date && createTaskDto.expected_end_date) {
                const taskStart = new Date(createTaskDto.start_date);
                const taskEnd = new Date(createTaskDto.expected_end_date);
                const projectStart = new Date(project.startDate);
                const projectEnd = new Date(project.endDate);

                if (taskStart < projectStart || taskEnd > projectEnd) {
                    throw new BadRequestException('Task dates must be within project timeline');
                }
            }
        }

        // Check for duplicate task names in same project (if setting is enabled)
        const allowDuplication = (await this.companySettingsService.findOne())?.allowTaskDuplication;
        if (!allowDuplication && createTaskDto.project_id) {
            const existingTask = await this.taskModel.findOne({
                name: createTaskDto.name,
                project_id: createTaskDto.project_id,
            });
            
            if (existingTask) {
                throw new BadRequestException('Task with this name already exists in the project');
            }
        }

        // End date cannot be in the past
        if (createTaskDto.expected_end_date) {
            const endDate = new Date(createTaskDto.expected_end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (endDate < today) {
                throw new BadRequestException('Task end date cannot be in the past');
            }
        }

        // Check if assigned employee is active
        if (createTaskDto.assignee) {
            const assignee = await this.empService.findById(createTaskDto.assignee);
            if (!assignee) {
                throw new BadRequestException('Assigned employee not found');
            }
        }
    }

    /**
     * Gets tasks with flat list structure including section information
     */
    async getTasksFlatList(filters: any): Promise<{ status: boolean, message: string, data: any[] }> {
        try {
            const query: any = {};

            // Apply filters
            if (filters.departmentId) query.department_id = filters.departmentId;
            if (filters.projectId) query.project_id = filters.projectId;
            if (filters.empId) query.emp = filters.empId;
            if (filters.status) query.status = filters.status;
            if (filters.priority) query.priority = filters.priority;

            const tasks = await this.taskModel.find(query)
                .populate([
                    ...this.defaultPopulateOptions,
                    { path: 'section_id', select: 'name' }
                ])
                .lean()
                .exec();

            // Transform to flat list with section information
            const flatTasks = tasks.map(task => ({
                ...task,
                sectionName: task.section_id ? (task.section_id as any).name : 'No Section',
                progress: task.progress || 0,
                isOverdue: task.due_date < new Date() && task.status !== TASK_STATUS.DONE
            }));

            return { status: true, message: 'Tasks retrieved successfully', data: flatTasks };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve flat task list', error.message);
        }
    }

    /**
     * Updates task board position for Kanban customization
     */
    async updateTaskBoardPosition(
        taskId: string,
        sectionId: string,
        boardOrder: number,
        empId: string
    ): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findById(taskId);
            if (!task) {
                throw new NotFoundException('Task not found');
            }

            // Update task position
            task.section_id = new Types.ObjectId(sectionId);
            task.boardOrder = boardOrder;
            task.boardPosition = `${sectionId}_${boardOrder}`;

            await task.save();

            return { status: true, message: 'Task board position updated successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task board position', error.message);
        }
    }

    /**
     * Calculates task progress based on company settings
     */
    async calculateTaskProgress(task: TaskDocument): Promise<number> {
        const settings = await this.companySettingsService.getOrCreateSettings();
        
        if (task.status === TASK_STATUS.DONE) {
            return 100;
        }

        if (settings.progressCalculationMethod === ProgressCalculationMethod.TIME_BASED) {
            // Progress based on estimated vs actual time
            if (task.estimated_hours && task.estimated_hours > 0 && task.actual_hours) {
                const progress = (task.actual_hours / task.estimated_hours) * 100;
                return Math.min(progress, 100); // Cap at 100%
            }
        } else {
            // Progress based on dates
            if (task.start_date && task.expected_end_date) {
                const now = new Date();
                const startDate = new Date(task.start_date);
                const endDate = new Date(task.actual_end_date || task.expected_end_date);
                
                const totalDuration = endDate.getTime() - startDate.getTime();
                const elapsedDuration = now.getTime() - startDate.getTime();
                
                if (totalDuration > 0) {
                    const progress = (elapsedDuration / totalDuration) * 100;
                    return Math.min(Math.max(progress, 0), 100); // Between 0-100%
                }
            }
        }

        return 0;
    }

    /**
     * Creates subtask with enhanced validation
     */
    async createSubtaskWithValidation(parentTaskId: string, createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            await this.validateSubtaskCreationPrerequisites(parentTaskId, createTaskDto);

            // Set parent task reference
            createTaskDto.parent_task = parentTaskId;

            // Create subtask using enhanced creation method
            return await this.createTaskWithEnhancements(createTaskDto);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create subtask', error.message);
        }
    }

    /**
     * Validates subtask creation prerequisites
     */
    private async validateSubtaskCreationPrerequisites(parentTaskId: string, createTaskDto: CreateTaskDto): Promise<void> {
        const parentTask = await this.taskModel.findById(parentTaskId);
        if (!parentTask) {
            throw new BadRequestException('Parent task not found');
        }

        // Cannot add subtask if parent has logged hours
        if (parentTask.hasLoggedHours) {
            throw new BadRequestException('Cannot add subtask to a task that already has logged hours');
        }

        // Subtask dates must be within parent task timeline
        if (createTaskDto.start_date && createTaskDto.expected_end_date) {
            const subtaskStart = new Date(createTaskDto.start_date);
            const subtaskEnd = new Date(createTaskDto.expected_end_date);
            const parentStart = new Date(parentTask.start_date);
            const parentEnd = new Date(parentTask.expected_end_date || parentTask.due_date);

            if (subtaskStart < parentStart || subtaskEnd > parentEnd) {
                throw new BadRequestException('Subtask dates must be within parent task timeline');
            }
        }

        // Check if assignee is in same project/department
        if (createTaskDto.assignee && parentTask.project_id) {
            const assignee = await this.empService.findById(createTaskDto.assignee);
            if (!assignee) {
                throw new BadRequestException('Assignee not found');
            }
            
            // Check if assignee is in the same department or project team
            if (parentTask.department_id && assignee.department_id.toString() !== parentTask.department_id.toString()) {
                throw new BadRequestException('Assignee must be in the same department as parent task');
            }
        }
    }

    /**
     * Enhanced task status update with validation rules
     */
    async updateTaskStatusWithValidation(
        taskId: string,
        newStatus: TASK_STATUS,
        empId: string
    ): Promise<{ status: boolean; message: string }> {
        try {
            const task = await this.taskModel.findById(taskId);
            if (!task) {
                throw new NotFoundException('Task not found');
            }

            const oldStatus = task.status;

            // Validate status change rules
            await this.validateStatusChangeRules(task, newStatus, empId);

            // Update status
            task.status = newStatus;
            
            // Update actual end date if marking as done
            if (newStatus === TASK_STATUS.DONE) {
                task.actual_end_date = new Date();
            }

            // Recalculate progress
            task.progress = await this.calculateTaskProgress(task);

            await task.save();

            // Notify status change
            if (oldStatus !== newStatus) {
                await this.notificationService.notifyTaskStatusChanged(task, empId);
            }

            // Update parent task if needed
            if (task.parent_task) {
                await this.checkAndUpdateParentTaskStatus(task.parent_task.toString(), newStatus, empId);
            }

            return { status: true, message: `Task status updated to ${newStatus}` };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task status', error.message);
        }
    }

    /**
     * Validates status change rules
     */
    private async validateStatusChangeRules(task: TaskDocument, newStatus: TASK_STATUS, empId: string): Promise<void> {
        // Cannot mark as completed without logged hours
        if (newStatus === TASK_STATUS.DONE && !task.hasLoggedHours) {
            throw new BadRequestException('Cannot mark task as completed without logging any hours');
        }

        // Cannot mark as pending if actual time is logged
        if (newStatus === TASK_STATUS.PENDING && task.actual_hours && task.actual_hours > 0) {
            throw new BadRequestException('Cannot mark task as pending when actual time is already logged');
        }

        // Cannot modify if linked project is completed
        if (task.project_id) {
            const project = await this.projectService.getProjectById(task.project_id.toString());
            if (project && project.status === ProjectStatus.COMPLETED) {
                throw new BadRequestException('Cannot modify task status for completed project');
            }
        }
    }

    /**
     * Logs time to a task and updates hasLoggedHours flag
     */
    async logTimeToTask(taskId: string, hours: number, empId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findById(taskId);
            if (!task) {
                throw new NotFoundException('Task not found');
            }

            // Update actual hours
            task.actual_hours = (task.actual_hours || 0) + hours;
            task.hasLoggedHours = true;

            // Recalculate progress
            task.progress = await this.calculateTaskProgress(task);

            await task.save();

            return { status: true, message: 'Time logged successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to log time', error.message);
        }
    }

    /**
     * Gets tasks organized by board sections for Kanban view
     */
    async getTasksByBoardSections(filters: any): Promise<{ status: boolean, message: string, data: any }> {
        try {
            const query: any = {};

            // Apply filters
            if (filters.departmentId) query.department_id = filters.departmentId;
            if (filters.projectId) query.project_id = filters.projectId;
            if (filters.empId) query.emp = filters.empId;

            const tasks = await this.taskModel.find(query)
                .populate(this.defaultPopulateOptions)
                .sort({ boardOrder: 1 })
                .lean()
                .exec();

            // Group tasks by sections
            const tasksBySection = tasks.reduce((acc, task) => {
                const sectionId = task.section_id ? task.section_id.toString() : 'no_section';
                const sectionName = task.section_id ? (task.section_id as any).name : 'No Section';
                
                if (!acc[sectionId]) {
                    acc[sectionId] = {
                        sectionId,
                        sectionName,
                        tasks: []
                    };
                }
                
                acc[sectionId].tasks.push({
                    ...task,
                    progress: task.progress || 0,
                    isOverdue: task.due_date < new Date() && task.status !== TASK_STATUS.DONE
                });
                
                return acc;
            }, {});

            return { 
                status: true, 
                message: 'Tasks by board sections retrieved successfully', 
                data: Object.values(tasksBySection) 
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks by board sections', error.message);
        }
    }

    /**
     * Helper method to check and update parent task status
     */
    private async checkAndUpdateParentTaskStatus(
        parentTaskId: string, 
        subtaskStatus: TASK_STATUS, 
        empId: string
    ): Promise<void> {
        const parentTask = await this.taskModel.findById(parentTaskId);
        if (!parentTask) return;

        const subtasks = await this.taskModel.find({ parent_task: parentTaskId }).exec();
        if (subtasks.length === 0) return;

        const statusHierarchy = [
            TASK_STATUS.PENDING,
            TASK_STATUS.ONGOING,
            TASK_STATUS.ON_TEST,
            TASK_STATUS.DONE
        ];

        if (subtaskStatus === TASK_STATUS.DONE) {
            const allSubtasksDone = subtasks.every(subtask => subtask.status === TASK_STATUS.DONE);

            if (allSubtasksDone && parentTask.emp?.toString() === empId) {
                parentTask.status = TASK_STATUS.DONE;
                parentTask.progress = 100;
                await parentTask.save();

                await this.notificationService.notifyTaskStatusChanged(parentTask, empId);

                if (parentTask.parent_task) {
                    await this.checkAndUpdateParentTaskStatus(
                        parentTask.parent_task.toString(), 
                        TASK_STATUS.DONE, 
                        empId
                    );
                }
            }
        } else {
            const subtaskStatusValues = subtasks.map(subtask => subtask.status);
            let minStatus = TASK_STATUS.DONE;

            for (const status of statusHierarchy) {
                if (subtaskStatusValues.includes(status)) {
                    minStatus = status;
                    break;
                }
            }

            if (parentTask.status !== minStatus) {
                parentTask.status = minStatus;
                parentTask.progress = await this.calculateTaskProgress(parentTask);
                await parentTask.save();

                await this.notificationService.notifyTaskStatusChanged(parentTask, empId);

                if (parentTask.parent_task) {
                    await this.checkAndUpdateParentTaskStatus(
                        parentTask.parent_task.toString(), 
                        minStatus, 
                        empId
                    );
                }
            }
        }
    }
}

export { EnhancedTasksService };
