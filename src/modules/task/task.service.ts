import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmpService } from '../emp/emp.service';
import { NotificationService } from '../notification/notification.service';
import { ProjectService } from '../project/project.service';
import { SectionService } from '../section/section.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { GetTreeDto } from './dtos/get-tree.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { Task, TaskDocument } from './schema/task.schema';

/**
 * Service responsible for managing tasks
 */
@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
        private readonly sectionService: SectionService,
        @Inject(forwardRef(() => ProjectService))
        private readonly projectService: ProjectService,
        private readonly notificationService: NotificationService,
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
        { path: "assignee" }
    ];

    /**
     * Paginates query results
     */
    private async paginate(query: any, page: number, limit: number) {
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

    /**
     * Creates a task for a department
     */
    async createTaskForDepartment(createTaskDto: CreateTaskDto) {
        if (!createTaskDto.department_id) {
            throw new BadRequestException('Department ID is required');
        }

        // Initialize sections and retrieve section ID

        // Find department manager
        const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
        if (!manager) {
            throw new NotFoundException("this department doest have manager");
        }
        const section = await this.sectionService.createInitialSections(manager._id.toString()) as any;
        createTaskDto.section_id = section._id.toString();

        const taskData = {
            ...createTaskDto,
            emp: manager._id.toString(),
            department_id: createTaskDto.department_id,
        };

        const task = new this.taskModel(taskData);
        const savedTask = await task.save();

        // Send notification
        await this.notificationService.notifyTaskCreated(
            savedTask,
            manager!._id.toString(),
            savedTask.assignee?.toString()
        );

        return savedTask;
    }

    /**
     * Creates a task for a project
     */
    async createTaskForProject(createTaskDto: CreateTaskDto) {
        if (!createTaskDto.project_id || !createTaskDto.department_id) {
            throw new BadRequestException('Project ID and Department ID are required');
        }

        // Find department manager
        const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
        if (!manager) {
            throw new BadRequestException('No manager found for this department');
        }

        // Verify project exists
        const project = await this.projectService.getProjectById(createTaskDto.project_id!);
        if (!project) {
            throw new NotFoundException('Project not found');
        }

        // Initialize sections and retrieve section ID
        await this.sectionService.createInitialSections(createTaskDto.department_id);
        const section_id = await this.sectionService.getRecentlySectionId(createTaskDto.department_id);

        // Set up task data
        createTaskDto.section_id = section_id;
        createTaskDto.emp = manager._id.toString();

        // Save task and notify
        const task = new this.taskModel(createTaskDto);
        const savedTask = await task.save();

        await this.notificationService.notifyTaskCreated(
            savedTask,
            createTaskDto.emp!,
            savedTask.assignee?.toString()
        );

        return savedTask;
    }

    /**
     * Gets recurring tasks
     */
    async getRecurringTasks(): Promise<TaskDocument[]> {
        const today = new Date();
        return this.taskModel.find({
            isRecurring: true,
            end_date: { $gte: today },
        }).exec();
    }

    /**
     * Creates a task for an employee
     */
    async createTaskForEmp(createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            if (!createTaskDto.emp) {
                throw new BadRequestException('Employee ID is required');
            }

            // Find employee's department
            const departmentId = await this.empService.findDepartmentIdByEmpId(createTaskDto.emp);
            if (!departmentId) {
                throw new NotFoundException('Department ID not found for this employee');
            }

            // Initialize sections and retrieve section ID
            await this.sectionService.createInitialSections(departmentId);
            const section_id = await this.sectionService.getRecentlySectionId(departmentId);
            createTaskDto.section_id = section_id;

            // Create and save task
            const task = new this.taskModel({
                ...createTaskDto,
                department_id: departmentId,
            });
            const savedTask = await task.save();

            // Send notification
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

    /**
     * Gets all tasks with full population
     */
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

    /**
     * Gets tasks by department ID
     */
    async getTasksByDepartmentId(departmentId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ department_id: departmentId, project_id: null })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const tasksDto = tasks.map(task => new GetTaskDto(task));
            return { status: true, message: 'Tasks retrieved successfully', data: tasksDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }

    /**
     * Gets a task by ID with full population including subtasks
     */
    async getTaskById(id: string): Promise<{ status: boolean, message: string, data?: GetTaskDto }> {
        try {
            // First fetch the task with standard population
            const task = await this.taskModel.findById(id)
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            // Use a helper method to fetch all subtasks recursively
            const subtasks = await this.fetchSubtasksRecursively(id);

            // Add subtasks to the task object
            const taskWithSubtasks = {
                ...task,
                subtasks: subtasks
            };

            const taskDto = new GetTaskDto(taskWithSubtasks);
            return { status: true, message: 'Task retrieved successfully', data: taskDto };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve task', error.message);
        }
    }

    /**
     * Helper method to fetch subtasks recursively
     * This allows us to get nested subtasks at any depth
     */
    private async fetchSubtasksRecursively(parentId: string): Promise<any[]> {
        // Fetch immediate subtasks
        const subtasks = await this.taskModel.find({ parent_task: parentId })
            .populate(this.defaultPopulateOptions)
            .lean()
            .exec();

        // For each subtask, fetch its subtasks recursively
        const results = await Promise.all(
            subtasks.map(async (subtask) => {
                const childSubtasks = await this.fetchSubtasksRecursively(subtask._id.toString());
                return {
                    ...subtask,
                    subtasks: childSubtasks
                };
            })
        );

        return results;
    }


    /**
     * Updates a task
     */
    async updateTask(
        id: string,
        updateTaskDto: UpdateTaskDto,
        empId: string
    ): Promise<{ status: boolean; message: string }> {
        try {
            // Find task
            const task = await this.taskModel.findById(new Types.ObjectId(id));
            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            const oldStatus = task.status;

            // Check if task is already done
            if (task.status === TASK_STATUS.DONE && oldStatus !== TASK_STATUS.DONE) {
                throw new ForbiddenException('You are not authorized to update this task because it is done');
            }

            // Save old status for comparison

            // Only apply status-related checks if the status is being updated
            if (updateTaskDto.status && updateTaskDto.status !== oldStatus) {
                // Check if task has subtasks
                const hasSubtasks = await this.taskModel.exists({ parent_task: id });

                // If trying to update status and task has subtasks
                if (hasSubtasks) {
                    if (updateTaskDto.status === TASK_STATUS.DONE) {
                        // Check if all subtasks are done
                        const allSubtasksDone = await this.areAllSubtasksDone(id);
                        if (!allSubtasksDone) {
                            throw new BadRequestException('Cannot mark task as done until all subtasks are completed');
                        }
                    } else {
                        // For any status other than DONE, don't allow status update when task has subtasks
                        throw new BadRequestException('Cannot update status for a task with subtasks');
                    }
                }

                // Special permission checks for status changes to DONE
                if (updateTaskDto.status === TASK_STATUS.DONE) {
                    if (task.assignee?.toString() !== empId) {
                        throw new ForbiddenException('You are not authorized to mark this task as done');
                    }
                }

                // Check permissions for status updates
                if (task.emp?.toString() !== empId) {
                    throw new ForbiddenException('You are not authorized to update this task status');
                }
            }

            // Priority update permission check
            if (updateTaskDto.priority && task.assignee?.toString() !== empId) {
                updateTaskDto.priority = undefined;
                // throw new ForbiddenException('You are not authorized to update the priority of this task');
            }

            // Handle due_date updates for subtasks
            if (updateTaskDto.due_date) {
                const subTasks = await this.taskModel.find({
                    parent_task: id
                }).exec();

                await Promise.all(
                    subTasks.map(async (subTask) => {
                        if (new Date(subTask.due_date!) > new Date(updateTaskDto.due_date!)) {
                            subTask.due_date = updateTaskDto.due_date!;
                            await subTask.save();
                        }
                    })
                );
            }

            // Update the task
            const updatedTask = await this.taskModel
                .findByIdAndUpdate(id, updateTaskDto, { new: true })
                .exec();

            if (!updatedTask) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            // Notify of status change if needed
            if (updateTaskDto.status && oldStatus !== updateTaskDto.status) {
                await this.notificationService.notifyTaskStatusChanged(updatedTask, empId);
            }

            // If this is a subtask and status has changed, check if parent task needs update
            if (updateTaskDto.status && oldStatus !== updateTaskDto.status && task.parent_task) {
                await this.checkAndUpdateParentTaskStatus(task.parent_task.toString(), updateTaskDto.status, empId);
            }

            return { status: true, message: 'Task updated successfully' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task', error.message);
        }
    }


    /**
     * Helper method to check if all subtasks of a task are done
     */
    private async areAllSubtasksDone(taskId: string): Promise<boolean> {
        const subtasks = await this.taskModel.find({ parent_task: taskId }).exec();

        if (subtasks.length === 0) {
            return true; // No subtasks means all are done
        }

        // Check if any subtask is not DONE
        const allDone = subtasks.every(subtask => subtask.status === TASK_STATUS.DONE);
        return allDone;
    }

    /**
     * Helper method to check and update parent task status
     * when a subtask status changes
     */
    private async checkAndUpdateParentTaskStatus(parentTaskId: string, subtaskStatus: TASK_STATUS, empId: string): Promise<void> {
        // Get the parent task
        const parentTask = await this.taskModel.findById(parentTaskId);
        if (!parentTask) {
            return; // Parent task not found, nothing to do
        }

        // Get all subtasks of the parent
        const subtasks = await this.taskModel.find({ parent_task: parentTaskId }).exec();
        if (subtasks.length === 0) {
            return; // No subtasks, nothing to do
        }

        // Special handling based on status hierarchy
        // Define the status hierarchy from lowest to highest
        const statusHierarchy = [
            TASK_STATUS.PENDING,
            TASK_STATUS.ONGOING,
            TASK_STATUS.ON_TEST,
            TASK_STATUS.DONE
        ];

        if (subtaskStatus === TASK_STATUS.DONE) {
            // For DONE status - check if all subtasks are DONE
            const allSubtasksDone = subtasks.every(subtask => subtask.status === TASK_STATUS.DONE);

            // Only update parent status to DONE if all subtasks are done AND user is the creator
            if (allSubtasksDone && parentTask.emp?.toString() === empId) {
                parentTask.status = TASK_STATUS.DONE;
                await parentTask.save();

                // Notify about the status change
                await this.notificationService.notifyTaskStatusChanged(parentTask, empId);

                // If this parent has a parent, continue checking up the chain
                if (parentTask.parent_task) {
                    await this.checkAndUpdateParentTaskStatus(parentTask.parent_task.toString(), TASK_STATUS.DONE, empId);
                }
            }
        } else {
            // For other statuses - find the minimum status among subtasks
            // First, get the status values for all subtasks
            const subtaskStatusValues = subtasks.map(subtask => subtask.status);

            // Determine the minimum status from the hierarchy
            let minStatus = TASK_STATUS.DONE; // Start with the highest status

            for (const status of statusHierarchy) {
                if (subtaskStatusValues.includes(status)) {
                    minStatus = status;
                    break; // Found the minimum status, break the loop
                }
            }

            // Update parent status to the minimum status (only if it's different)
            if (parentTask.status !== minStatus) {
                parentTask.status = minStatus;
                await parentTask.save();

                // Notify about the status change
                await this.notificationService.notifyTaskStatusChanged(parentTask, empId);

                // If this parent has a parent, continue checking up the chain
                if (parentTask.parent_task) {
                    await this.checkAndUpdateParentTaskStatus(parentTask.parent_task.toString(), minStatus, empId);
                }
            }
        }
    }



    /**
     * Deletes a task
     */
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

    /**
     * Gets tasks for a project
     */
    async getProjectTasks(projectId: string, empId: string): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ project_id: projectId })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDto = tasks.map((task) => new GetTaskDto(task));
            return { status: true, message: 'Tasks retrieved successfully', data: taskDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve project tasks', error.message);
        }
    }

    /**
     * Gets project task details with overdue status
     */
    async getProjectTaskDetails(projectId: string) {
        try {
            const tasks = await this.taskModel.find({ project_id: projectId }).lean().exec();
            return tasks.map((task) => ({
                ...task,
                is_over_due: task.due_date < new Date() && task.status !== TASK_STATUS.DONE
            }));
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve project task details', error.message);
        }
    }

    /**
     * Gets tasks for a project filtered by department
     */
    async getTaskProjectByDepartmentId(projectId: string, departmentId: string) {
        try {
            const { info } = await this.buildFullTaskList({ projectId, departmentId }, "");
            return info;
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve project tasks by department', error.message);
        }
    }

    /**
     * Gets tasks for an employee
     */
    async getEmpTasks(empId: string): Promise<{ status: boolean, message: string, data?: GetTaskDto[] }> {
        try {
            const tasks = await this.taskModel.find({ emp: empId, project_id: null })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDto = tasks.map((task) => new GetTaskDto(task));
            return { status: true, message: 'Tasks retrieved successfully', data: taskDto };
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return { status: false, message: "Failed to retrieve tasks", data: [] };
        }
    }

    /**
     * Starts a task
     */
    async startTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            // Check if task exists
            const task = await this.taskModel.findOne({
                _id: new Types.ObjectId(taskId)
            });

            if (!task) {
                throw new NotFoundException('Task not found');
            }

            // Check if this task is already started
            const lastLog = task.timeLogs?.[task.timeLogs.length - 1];
            if (lastLog && !lastLog.end) {
                throw new BadRequestException('This task is already started');
            }

            // Find all tasks with running timers for this user
            const runningTasks = await this.taskModel.find({
                'timeLogs': {
                    $elemMatch: {
                        end: null
                    }
                },
                emp: userId
            });

            // Stop all other running tasks
            for (const runningTask of runningTasks) {
                if (runningTask._id.toString() !== taskId) {
                    await this.pauseTask(runningTask._id.toString(), userId);
                }
            }

            // Start the timer for this task
            task.timeLogs = task.timeLogs || [];
            task.timeLogs.push({ start: new Date(), end: undefined });

            // Set status to ONGOING if not already DONE or ON_TEST
            if (task.status !== TASK_STATUS.DONE && task.status !== TASK_STATUS.ON_TEST) {
                task.status = TASK_STATUS.ONGOING;
            }

            await task.save();

            return { status: true, message: 'Task started successfully' };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to start task', error.message);
        }
    }

    /**
     * Pauses a task
     */
    async pauseTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findOne({
                _id: new Types.ObjectId(taskId)
            });

            if (!task) {
                throw new NotFoundException('Task not found');
            }

            if (!task.timeLogs?.length) {
                throw new BadRequestException('No time logs found for this task');
            }

            const lastLog = task.timeLogs[task.timeLogs.length - 1];
            if (lastLog.end) {
                throw new BadRequestException('Task is already paused');
            }

            const now = new Date();
            lastLog.end = now;

            const timeDiffInMilliseconds = now.getTime() - lastLog.start.getTime();
            const timeDiffInSeconds = Math.round(timeDiffInMilliseconds / 1000);

            task.totalTimeSpent = (task.totalTimeSpent || 0) + parseFloat(timeDiffInSeconds.toFixed(2));

            await task.save();

            return { status: true, message: 'Task paused successfully' };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to pause task', error.message);
        }
    }

    /**
     * Completes a task
     */
    async completeTask(taskId: string, userId: string): Promise<{ status: boolean, message: string, finalTime: number }> {
        try {
            const task = await this.taskModel.findOne({ _id: new Types.ObjectId(taskId) });
            if (!task) throw new NotFoundException('Task not found');

            // If task is running, pause it first
            const lastLog = task.timeLogs?.[task.timeLogs.length - 1];
            if (lastLog && !lastLog.end) {
                await this.pauseTask(taskId, userId);
            }

            task.status = TASK_STATUS.DONE;

            // Calculate overall time from first log to now
            let durationInSeconds = 0;
            if (task.timeLogs?.length > 0) {
                const firstLogStart = new Date(task.timeLogs[0].start).getTime();
                const now = new Date().getTime();
                durationInSeconds = Math.floor((now - firstLogStart) / 1000);
            }

            task.over_all_time = durationInSeconds.toString();
            await task.save();

            return {
                status: true,
                message: 'Task completed successfully',
                finalTime: task.totalTimeSpent || 0
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to complete task', error.message);
        }
    }

    /**
     * Marks a task as complete
     */
    async markAsComplete(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findOne({ _id: taskId, emp: userId });
            if (!task) throw new NotFoundException('Task not found');

            task.status = TASK_STATUS.DONE;
            await task.save();

            return { status: true, message: 'Task marked as complete successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to mark task as complete', error.message);
        }
    }

    /**
     * Adds a subtask to a parent task
     */
    async addSubtask(taskId: string, createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            // Find parent task
            const parentTask = await this.taskModel.findById(taskId);
            if (!parentTask) throw new NotFoundException('Parent task not found');
            if (parentTask.status == TASK_STATUS.DONE) {
                throw new ConflictException("You can not add sub task for this task cause this task is Done");
            }
            // Get employee details
            const emp = await this.empService.findById(createTaskDto.emp!);
            if (!emp) throw new NotFoundException('Employee not found');

            createTaskDto.department_id = emp.department_id._id.toString();

            // Initialize sections and retrieve section ID
            const section = await this.sectionService.createInitialSections(emp._id.toString()) as any;
            const section_id = section._id.toString();
            createTaskDto.section_id = section_id;

            // Create and save subtask
            const subtask = new this.taskModel({
                ...createTaskDto,
                status: TASK_STATUS.PENDING,
                parent_task: parentTask._id.toString(),
            });

            await subtask.save();

            return {
                status: true,
                message: 'Subtask added successfully',
                data: subtask,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(error.message || 'Failed to add subtask');
        }
    }

    /**
     * Gets subtasks for a parent task
     */
    async getSubTasksByParentTask(parent_id: string): Promise<TaskDocument[]> {
        return this.taskModel.find({ parent_task: parent_id }).exec();
    }

    /**
     * Updates a task's status
     */
    async updateTaskStatus(taskId: string, userId: string, newStatus: TASK_STATUS): Promise<{ status: boolean, message: string }> {
        try {
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
            await this.notificationService.notifyTaskStatusChanged(task, userId);

            return { status: true, message: `Task status updated to ${newStatus}` };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task status', error.message);
        }
    }

    /**
     * Updates a task's description
     */
    async updateDescription(taskId: string, newDescription: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findById(taskId);
            if (!task) throw new NotFoundException('Task not found');

            task.description = newDescription;
            await task.save();

            return { status: true, message: 'Task description updated successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task description', error.message);
        }
    }

    /**
     * Gets tasks created this week for an employee
     */
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

            const taskDto = weeklyTasks.map((task) => new GetTaskDto(task));

            return { status: true, message: 'Weekly tasks retrieved successfully', data: taskDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve weekly tasks', error.message);
        }
    }

    /**
     * Gets tasks created this month for an employee
     */
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

            const taskDto = monthlyTasks.map((task) => new GetTaskDto(task));

            return { status: true, message: 'Monthly tasks retrieved successfully', data: taskDto };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve monthly tasks', error.message);
        }
    }

    /**
     * Gets tasks in "ON_TEST" status for a department
     */
    async getOnTestTask(department_id: string) {
        try {
            const tasks = await this.taskModel.find({ department_id, status: TASK_STATUS.ON_TEST })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            return tasks.map((task) => new GetTaskDto(task));
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve on-test tasks', error.message);
        }
    }

    /**
     * Builds a full task list including parent tasks and subtasks
     */
    async buildFullTaskList(treeDto: GetTreeDto, empId: string): Promise<{ tree: any[], info: any[] }> {
        try {
            // Build query based on parameters
            const query: any = { parent_task: null };

            if (treeDto.departmentId && treeDto.projectId) {
                query.department_id = treeDto.departmentId;
                query.project_id = treeDto.projectId;
            } else if (treeDto.departmentId) {
                query.department_id = treeDto.departmentId;
                query.project_id = null;
            } else {
                query.emp = empId;
                query.project_id = null;
            }

            // Get parent tasks
            const parentTasks = await this.taskModel
                .find(query)
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            const taskDtos = parentTasks.map((task) => new GetTaskDto(task));

            const fullList: any[] = [];
            const tasksInfo: any[] = [];

            // Process each parent task and its subtasks
            for (const task of taskDtos) {
                await this.collectTasksRecursively(task, fullList);
            }

            return { tree: fullList, info: taskDtos };
        } catch (error) {
            throw new InternalServerErrorException('Failed to build full task list', error.message);
        }
    }

    /**
     * Recursively collects tasks and their subtasks
     */
    async collectTasksRecursively(task: GetTaskDto, fullList: any[]): Promise<void> {
        // Add task to lists
        fullList.push({
            id: task.id,
            name: task.name,
            parentId: task.parent_task,
        });

        // Get subtasks
        const subTasks = await this.taskModel
            .find({ parent_task: task.id })
            .populate(this.defaultPopulateOptions)
            .lean()
            .exec();

        const subTaskDtos = subTasks.map((subTask) => new GetTaskDto(subTask));

        // Process each subtask recursively
        for (const subTask of subTaskDtos) {
            await this.collectTasksRecursively(subTask, fullList);
        }
    }

    /**
     * Gets detailed subtasks for a parent task
     */
    async getSubTaskByParentTask(parentId: string) {
        try {
            const tasks = await this.taskModel.find({ parent_task: parentId })
                .populate(this.defaultPopulateOptions)
                .lean()
                .exec();

            return tasks.map((subTask) => new GetTaskDto(subTask));
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve subtasks', error.message);
        }
    }

    /**
     * Checks if a task can be completed (all subtasks are done)
     */
    async canCompleteTask(id: string): Promise<boolean> {
        try {
            const task = await this.taskModel.findById(id).exec();
            if (!task) {
                throw new NotFoundException("Task not found");
            }

            const subTasks = await this.taskModel.find({ parent_task: id }).lean().exec();
            if (subTasks.length === 0) {
                return true; // No subtasks, can complete
            }

            const completedSubTasks = subTasks.filter(task => task.status === TASK_STATUS.DONE);
            return completedSubTasks.length === subTasks.length;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to check task completion status', error.message);
        }
    }
}