import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmpService } from '../emp/emp.service';
import { NotificationService } from '../notification/notification.service';
import { ProjectService } from '../project/project.service';
import { SectionService } from '../section/section.service';
import { CreateSubTaskDto, CreateTaskDto } from './dtos/create-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { GetTreeDto } from './dtos/get-tree.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';
import { Task, TaskDocument } from './schema/task.schema';
import { ProjectStatus } from '../project/enums/project-status';
import { Project } from '../project/schema/project.schema';

/**
 * Service responsible for managing tasks
 */
@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(Project.name) private projectModel: Model<Project>,
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

        // شرط 1: التحقق من وجود مشروع واحد IN_PROGRESS على الأقل
        if (project.status !== ProjectStatus.IN_PROGRESS) {
            throw new BadRequestException(
                `Cannot add tasks to project. Project must be in IN_PROGRESS status. Current status: ${project.status}`
            );
        }

        // شرط 2: التحقق من صحة تواريخ المهمة بالنسبة لتواريخ المشروع
        const projectStartDate = new Date(project.startDate);
        const projectEndDate = new Date(project.endDate);

        projectStartDate.setHours(0, 0, 0, 0);
        projectEndDate.setHours(23, 59, 59, 999);

        if (createTaskDto.start_date) {
            const taskStartDate = new Date(createTaskDto.start_date);
            taskStartDate.setHours(0, 0, 0, 0);

            if (taskStartDate <= projectStartDate) {
                throw new BadRequestException(
                    `Task start date (${taskStartDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                );
            }

            if (taskStartDate >= projectEndDate) {
                throw new BadRequestException(
                    `Task start date (${taskStartDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                );
            }
        }

        if (createTaskDto.due_date) {
            const taskDueDate = new Date(createTaskDto.due_date);
            taskDueDate.setHours(23, 59, 59, 999);

            if (taskDueDate <= projectStartDate) {
                throw new BadRequestException(
                    `Task due date (${taskDueDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                );
            }

            if (taskDueDate >= projectEndDate) {
                throw new BadRequestException(
                    `Task due date (${taskDueDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                );
            }
        }

        if (createTaskDto.expected_end_date) {
            const taskExpectedEndDate = new Date(createTaskDto.expected_end_date);
            taskExpectedEndDate.setHours(23, 59, 59, 999);

            if (taskExpectedEndDate <= projectStartDate) {
                throw new BadRequestException(
                    `Task expected end date (${taskExpectedEndDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                );
            }

            if (taskExpectedEndDate >= projectEndDate) {
                throw new BadRequestException(
                    `Task expected end date (${taskExpectedEndDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                );
            }
        }

        if (createTaskDto.end_date) {
            const taskEndDate = new Date(createTaskDto.end_date);
            taskEndDate.setHours(23, 59, 59, 999);

            if (taskEndDate <= projectStartDate) {
                throw new BadRequestException(
                    `Task end date (${taskEndDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                );
            }

            if (taskEndDate >= projectEndDate) {
                throw new BadRequestException(
                    `Task end date (${taskEndDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                );
            }
        }

        // التحقق من منطقية ترتيب التواريخ
        if (createTaskDto.start_date && createTaskDto.due_date) {
            const taskStartDate = new Date(createTaskDto.start_date);
            const taskDueDate = new Date(createTaskDto.due_date);

            if (taskStartDate > taskDueDate) {
                throw new BadRequestException('Task start date cannot be after task due date');
            }
        }

        if (createTaskDto.start_date && createTaskDto.expected_end_date) {
            const taskStartDate = new Date(createTaskDto.start_date);
            const taskExpectedEndDate = new Date(createTaskDto.expected_end_date);

            if (taskStartDate > taskExpectedEndDate) {
                throw new BadRequestException('Task start date cannot be after task expected end date');
            }
        }

        // شرط 3: التحقق من عدم وجود مهمة بنفس الاسم في نفس المشروع
        const existingTask = await this.taskModel.findOne({
            name: { $regex: new RegExp(`^${createTaskDto.name.trim()}$`, 'i') },
            project_id: createTaskDto.project_id,
            isActive: true
        }).lean().exec();

        if (existingTask) {
            throw new BadRequestException(
                `A task with the name "${createTaskDto.name}" already exists in this project. Please choose a different name.`
            );
        }

        // شرط 4: التحقق من أن تواريخ الانتهاء ليست في الماضي
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (createTaskDto.due_date) {
            const dueDate = new Date(createTaskDto.due_date);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate < today) {
                throw new BadRequestException(
                    `Task due date (${dueDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                );
            }
        }

        if (createTaskDto.expected_end_date) {
            const expectedEndDate = new Date(createTaskDto.expected_end_date);
            expectedEndDate.setHours(0, 0, 0, 0);

            if (expectedEndDate < today) {
                throw new BadRequestException(
                    `Task expected end date (${expectedEndDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                );
            }
        }

        if (createTaskDto.end_date) {
            const endDate = new Date(createTaskDto.end_date);
            endDate.setHours(0, 0, 0, 0);

            if (endDate < today) {
                throw new BadRequestException(
                    `Task end date (${endDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                );
            }
        }

        // شرط 5: التحقق من أن الموظف المُسند إليه نشط
        const employee = await this.empService.findById(manager._id.toString());

        if (!employee) {
            throw new NotFoundException(`Employee with ID ${manager._id.toString()} not found`);
        }

        if (!employee.isActive) {
            throw new BadRequestException(
                `Cannot assign task to inactive employee: ${employee.name || employee.email}`
            );
        }

        if (employee.isDeleted) {
            throw new BadRequestException(
                `Cannot assign task to deleted employee: ${employee.name || employee.email}`
            );
        }

        // if (employee.endDate && new Date(employee.endDate) < new Date()) {
        //     throw new BadRequestException(
        //         `Cannot assign task to employee whose employment has ended: ${employee.name || employee.email}`
        //     );
        // }

        // التحقق من الموظف المُسند إليه إذا كان مختلفاً عن المدير
        if (createTaskDto.assignee && createTaskDto.assignee !== manager._id.toString()) {
            const assignee = await this.empService.findById(createTaskDto.assignee);

            if (!assignee) {
                throw new NotFoundException(`Assignee with ID ${createTaskDto.assignee} not found`);
            }

            if (!assignee.isActive) {
                throw new BadRequestException(
                    `Cannot assign task to inactive employee: ${assignee.name || assignee.email}`
                );
            }

            if (assignee.isDeleted) {
                throw new BadRequestException(
                    `Cannot assign task to deleted employee: ${assignee.name || assignee.email}`
                );
            }

            // if (assignee.endDate && new Date(assignee.endDate) < new Date()) {
            //     throw new BadRequestException(
            //         `Cannot assign task to employee whose employment has ended: ${assignee.full_name || assignee.email}`
            //     );
            // }
        }

        // Initialize sections and retrieve section ID
        await this.sectionService.createInitialSections(manager._id.toString());
        const section_id = await this.sectionService.getRecentlySectionId(manager._id.toString());

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
            await this.sectionService.createInitialSections(createTaskDto.emp);
            const section_id = await this.sectionService.getRecentlySectionId(createTaskDto.emp);
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


    private mergeTaskDates(currentTask: any, updateDto: UpdateTaskDto): any {
        return {
            start_date: updateDto.start_date || currentTask.start_date,
            due_date: updateDto.due_date || currentTask.due_date,
            expected_end_date: updateDto.expected_end_date || currentTask.expected_end_date,
            end_date: updateDto.end_date || currentTask.end_date,
            name: updateDto.name || currentTask.name
        };
    }


    private hasDateUpdates(updateDto: UpdateTaskDto): boolean {
        return !!(
            updateDto.start_date ||
            updateDto.due_date ||
            updateDto.expected_end_date ||
            updateDto.end_date
        );
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
            // العثور على المهمة
            const task = await this.taskModel.findById(new Types.ObjectId(id))
                .populate('project_id')
                .exec();

            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            const oldStatus = task.status;

            // التحقق من حالة المشروع المرتبط
            if (task.project_id) {
                const project = task.project_id as any;
                if (project.status === ProjectStatus.COMPLETED) {
                    throw new BadRequestException(
                        'Cannot update task because the associated project is completed'
                    );
                }
            }

            // التحقق من إذا كانت المهمة مكتملة
            if (task.status === TASK_STATUS.DONE && oldStatus !== TASK_STATUS.DONE) {
                throw new ForbiddenException('You are not authorized to update this task because it is done');
            }

            // شرط 5: التحقق من نشاط الموظف المُسند إليه الجديد
            if (updateTaskDto.assignee) {
                await this.validateAssigneeIsActive(updateTaskDto.assignee);
            }

            // شرط 4: التحقق من التواريخ الجديدة
            if (this.hasDateUpdates(updateTaskDto)) {
                const mergedDates = this.mergeTaskDates(task, updateTaskDto);
                await this.validateTaskDatesNotInPast(mergedDates);

                if (task.project_id) {
                    const project = await this.projectService.getProjectById(task.project_id.toString());
                    if (project) {
                        await this.validateTaskDatesAgainstProject(mergedDates, project);
                    }
                }
            }

            // شرط 3: التحقق من تغيير اسم المهمة
            if (updateTaskDto.name && updateTaskDto.name !== task.name && task.project_id) {
                await this.validateUniqueTaskNameInProject(updateTaskDto.name, task.project_id.toString(), task._id.toString());
            }

            // التحقق من تحديث الحالة مع الشروط الجديدة
            if (updateTaskDto.status && updateTaskDto.status !== oldStatus) {
                // شرط جديد: لا يمكن إكمال المهمة بدون ساعات فعلية
                if (updateTaskDto.status === TASK_STATUS.DONE) {
                    if (!updateTaskDto.actual_hours || updateTaskDto.actual_hours <= 0) {
                        throw new BadRequestException(
                            'Cannot mark task as completed without logging actual hours. Please add actual hours first.'
                        );
                    }
                }

                // شرط جديد: لا يمكن إرجاع المهمة لـ Pending إذا تم تسجيل ساعات فعلية
                if (updateTaskDto.status === TASK_STATUS.PENDING) {
                    if ((task.actual_hours && task.actual_hours > 0) || task.timeLogs.length == 0) {
                        throw new BadRequestException(
                            'Cannot change task status to Pending because actual hours have been logged. Actual hours: ' + task.actual_hours
                        );
                    }
                }

                // فحص المهام الفرعية
                const hasSubtasks = await this.taskModel.exists({ parent_task: id });

                if (hasSubtasks) {
                    if (updateTaskDto.status === TASK_STATUS.DONE) {
                        const allSubtasksDone = await this.areAllSubtasksDone(id);
                        if (!allSubtasksDone) {
                            throw new BadRequestException('Cannot mark task as done until all subtasks are completed');
                        }
                    } else {
                        throw new BadRequestException('Cannot update status for a task with subtasks');
                    }
                }

                // فحوصات الصلاحيات
                if (updateTaskDto.status === TASK_STATUS.DONE) {
                    if (task.assignee?.toString() !== empId) {
                        throw new ForbiddenException('You are not authorized to mark this task as done');
                    }
                }

                if (task.emp?.toString() !== empId) {
                    throw new ForbiddenException('You are not authorized to update this task status');
                }
            }

            // تحديث الأولوية
            if (updateTaskDto.priority && task.assignee?.toString() !== empId) {
                updateTaskDto.priority = undefined;
            }

            // التعامل مع تحديثات تاريخ الاستحقاق للمهام الفرعية
            if (updateTaskDto.due_date) {
                const subTasks = await this.taskModel.find({ parent_task: id }).exec();

                await Promise.all(
                    subTasks.map(async (subTask) => {
                        if (new Date(subTask.due_date!) > new Date(updateTaskDto.due_date!)) {
                            subTask.due_date = updateTaskDto.due_date!;
                            await subTask.save();
                        }
                    })
                );
            }

            // تطبيق التحديث
            const updatedTask = await this.taskModel
                .findByIdAndUpdate(id, updateTaskDto, { new: true })
                .exec();

            if (!updatedTask) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            // إرسال إشعار تغيير الحالة
            if (updateTaskDto.status && oldStatus !== updateTaskDto.status) {
                await this.notificationService.notifyTaskStatusChanged(updatedTask, empId);
            }

            // فحص وتحديث حالة المهمة الأب
            if (updateTaskDto.status && oldStatus !== updateTaskDto.status && task.parent_task) {
                await this.checkAndUpdateParentTaskStatus(task.parent_task.toString(), updateTaskDto.status, empId);
            }

            return { status: true, message: 'Task updated successfully' };
        } catch (error) {
            if (error instanceof NotFoundException ||
                error instanceof ForbiddenException ||
                error instanceof BadRequestException) {
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
            TASK_STATUS.ONGOING,
            TASK_STATUS.PENDING,
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
    async addSubtask(taskId: string, createSubTaskDto: CreateSubTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            // العثور على المهمة الأب
            const parentTask = await this.taskModel.findById(taskId)
                .populate('project_id')
                .populate('department_id')
                .populate('emp')
                .populate('assignee')
                .exec();

            if (!parentTask) {
                throw new NotFoundException('Parent task not found');
            }

            if (parentTask.status === TASK_STATUS.DONE) {
                throw new ConflictException("You cannot add sub task for this task because this task is Done");
            }

            // شرط جديد 1: التحقق من عدم تسجيل أي ساعات فعلية على المهمة الأب
            if (parentTask.actual_hours && parentTask.actual_hours > 0) {
                throw new BadRequestException(
                    'Cannot add subtask to parent task that already has logged actual hours. Please remove logged hours first.'
                );
            }



            // إنشاء CreateTaskDto من CreateSubTaskDto + بيانات المهمة الأب
            const createTaskDto: CreateTaskDto = {
                // البيانات من CreateSubTaskDto
                name: createSubTaskDto.name,
                description: createSubTaskDto.description,
                priority: createSubTaskDto.priority,
                due_date: createSubTaskDto.due_date,
                start_date: createSubTaskDto.start_date,
                actual_end_date: createSubTaskDto.actual_end_date,
                expected_end_date: createSubTaskDto.expected_end_date,
                estimated_hours: createSubTaskDto.estimated_hours,
                files: createSubTaskDto.files,
                progressCalculationMethod: createSubTaskDto.progressCalculationMethod,
                end_date: createSubTaskDto.end_date,

                // البيانات المستمدة من المهمة الأب
                project_id: parentTask.project_id?.toString() || undefined,
                department_id: parentTask.department_id?.toString() || undefined,
                emp: createSubTaskDto.emp || parentTask.emp?.toString(),
                assignee: createSubTaskDto.assignee,
                section_id: parentTask.section_id?.toString() || undefined,

                // البيانات الافتراضية للمهمة الفرعية
                status: TASK_STATUS.PENDING,
                parent_task: parentTask._id.toString()
            };

            // شرط جديد 2: التحقق من أن تواريخ المهمة الفرعية ضمن نطاق المهمة الأب
            await this.validateSubtaskDatesAgainstParent(createTaskDto, parentTask);

            // تحديد الموظف المُسند للمهمة الفرعية
            let empId = createSubTaskDto.emp;
            if (!empId) {
                // إذا لم يتم تحديد موظف، استخدم موظف المهمة الأب
                empId = parentTask.emp?.toString();
                if (!empId) {
                    throw new BadRequestException('No employee specified and parent task has no assigned employee');
                }
            }

            // الحصول على تفاصيل الموظف المُسند إليه
            const emp = await this.empService.findById(empId);
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            // شرط جديد 3: التحقق من أن الموظف عضو في نفس المشروع أو القسم
            await this.validateEmployeeMembershipForSubtask(parentTask, emp, createTaskDto.assignee);

            // تطبيق الشروط الأساسية للمهام (إذا كانت المهمة الأب تنتمي لمشروع)
            if (parentTask.project_id) {
                createTaskDto.project_id = parentTask.project_id.toString();

                // شرط 1: التحقق من حالة المشروع
                await this.validateOngoingProjectRequirement(parentTask.project_id.toString());

                // شرط 2: التحقق من التواريخ بالنسبة للمشروع
                const project = await this.projectService.getProjectById(parentTask.project_id.toString());
                if (project) {
                    await this.validateTaskDatesAgainstProject(createTaskDto, project);
                }

                // شرط 3: التحقق من عدم تكرار الاسم
                await this.validateUniqueTaskNameInProject(createTaskDto.name, parentTask.project_id.toString());
            }

            // شرط 4: التحقق من التواريخ
            await this.validateTaskDatesNotInPast(createTaskDto);

            // شرط 5: التحقق من نشاط الموظف
            await this.validateAssigneeIsActive(empId);
            if (createTaskDto.assignee) {
                await this.validateAssigneeIsActive(createTaskDto.assignee);
            }

            // تحديث البيانات المستمدة من المهمة الأب
            createTaskDto.emp = empId;
            createTaskDto.department_id = parentTask.department_id?.toString() || emp.department_id._id.toString();

            // تهيئة الأقسام والحصول على معرف القسم
            let section_id: string;
            const section = await this.sectionService.createInitialSections(empId) as any;
            section_id = section._id.toString();
            createTaskDto.section_id = section_id;

            // إنشاء وحفظ المهمة الفرعية
            const subtask = new this.taskModel(createTaskDto);
            await subtask.save();

            // تحديث قائمة المهام الفرعية في المهمة الأب
            await this.taskModel.findByIdAndUpdate(
                parentTask._id,
                { $addToSet: { sub_tasks: subtask._id } },
                { new: true }
            );

            // إرسال إشعار
            await this.notificationService.notifyTaskCreated(
                subtask,
                empId,
                subtask.assignee?.toString()
            );

            return {
                status: true,
                message: 'Subtask added successfully',
                data: subtask,
            };
        } catch (error) {
            if (error instanceof NotFoundException ||
                error instanceof ConflictException ||
                error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(error.message || 'Failed to add subtask');
        }
    }



    /**
 * شرط 1: التحقق من أن المشروع في حالة IN_PROGRESS
 */
    private async validateOngoingProjectRequirement(projectId: string): Promise<void> {
        try {
            const project = await this.projectService.getProjectById(projectId);

            if (!project) {
                throw new NotFoundException(`Project with ID ${projectId} not found`);
            }

            if (project.status !== ProjectStatus.IN_PROGRESS) {
                throw new BadRequestException(
                    `Cannot add tasks to project. Project must be in IN_PROGRESS status. Current status: ${project.status}`
                );
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to validate project status', error.message);
        }
    }


    /**
     * شرط 2: التحقق من أن تواريخ المهمة ضمن نطاق تواريخ المشروع
     */
    private async validateTaskDatesAgainstProject(
        taskDto: CreateTaskDto | UpdateTaskDto | any,
        project: any
    ): Promise<void> {
        try {
            if (!project.startDate || !project.endDate) {
                throw new BadRequestException('Project must have start date and end date defined');
            }

            const projectStartDate = new Date(project.startDate);
            const projectEndDate = new Date(project.endDate);

            projectStartDate.setHours(0, 0, 0, 0);
            projectEndDate.setHours(23, 59, 59, 999);

            // التحقق من تاريخ بداية المهمة
            if (taskDto.start_date) {
                const taskStartDate = new Date(taskDto.start_date);
                taskStartDate.setHours(0, 0, 0, 0);

                if (taskStartDate < projectStartDate) {
                    throw new BadRequestException(
                        `Task start date (${taskStartDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                    );
                }

                if (taskStartDate > projectEndDate) {
                    throw new BadRequestException(
                        `Task start date (${taskStartDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                    );
                }
            }

            // التحقق من تاريخ استحقاق المهمة
            if (taskDto.due_date) {
                const taskDueDate = new Date(taskDto.due_date);
                taskDueDate.setHours(23, 59, 59, 999);

                if (taskDueDate < projectStartDate) {
                    throw new BadRequestException(
                        `Task due date (${taskDueDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                    );
                }

                if (taskDueDate > projectEndDate) {
                    throw new BadRequestException(
                        `Task due date (${taskDueDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                    );
                }
            }

            // التحقق من تاريخ النهاية المتوقع
            if (taskDto.expected_end_date) {
                const taskExpectedEndDate = new Date(taskDto.expected_end_date);
                taskExpectedEndDate.setHours(23, 59, 59, 999);

                if (taskExpectedEndDate < projectStartDate) {
                    throw new BadRequestException(
                        `Task expected end date (${taskExpectedEndDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                    );
                }

                if (taskExpectedEndDate > projectEndDate) {
                    throw new BadRequestException(
                        `Task expected end date (${taskExpectedEndDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                    );
                }
            }

            // التحقق من تاريخ النهاية الفعلي
            if (taskDto.end_date) {
                const taskEndDate = new Date(taskDto.end_date);
                taskEndDate.setHours(23, 59, 59, 999);

                if (taskEndDate < projectStartDate) {
                    throw new BadRequestException(
                        `Task end date (${taskEndDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                    );
                }

                if (taskEndDate > projectEndDate) {
                    throw new BadRequestException(
                        `Task end date (${taskEndDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                    );
                }
            }

            // التحقق من منطقية ترتيب التواريخ
            if (taskDto.start_date && taskDto.due_date) {
                const taskStartDate = new Date(taskDto.start_date);
                const taskDueDate = new Date(taskDto.due_date);

                if (taskStartDate > taskDueDate) {
                    throw new BadRequestException('Task start date cannot be after task due date');
                }
            }

            if (taskDto.start_date && taskDto.expected_end_date) {
                const taskStartDate = new Date(taskDto.start_date);
                const taskExpectedEndDate = new Date(taskDto.expected_end_date);

                if (taskStartDate > taskExpectedEndDate) {
                    throw new BadRequestException('Task start date cannot be after task expected end date');
                }
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to validate task dates against project', error.message);
        }
    }
    private async validateUniqueTaskNameInProject(
        taskName: string,
        projectId: string,
        excludeTaskId?: string
    ): Promise<void> {
        try {
            if (!taskName || !taskName.trim()) {
                throw new BadRequestException('Task name is required');
            }

            const query: any = {
                name: { $regex: new RegExp(`^${taskName.trim()}$`, 'i') },
                project_id: projectId,
                isActive: true
            };

            // استبعاد المهمة الحالية في حالة التحديث
            if (excludeTaskId) {
                query._id = { $ne: excludeTaskId };
            }

            const existingTask = await this.taskModel.findOne(query).lean().exec();

            if (existingTask) {
                throw new BadRequestException(
                    `A task with the name "${taskName}" already exists in this project. Please choose a different name.`
                );
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to validate unique task name', error.message);
        }
    }
    /**
     * شرط 4: التحقق من أن تواريخ الانتهاء ليست في الماضي
     */
    private async validateTaskDatesNotInPast(taskDto: CreateTaskDto | UpdateTaskDto | any): Promise<void> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // التحقق من تاريخ الاستحقاق
            if (taskDto.due_date) {
                const dueDate = new Date(taskDto.due_date);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate < today) {
                    throw new BadRequestException(
                        `Task due date (${dueDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            // التحقق من تاريخ النهاية المتوقع
            if (taskDto.expected_end_date) {
                const expectedEndDate = new Date(taskDto.expected_end_date);
                expectedEndDate.setHours(0, 0, 0, 0);

                if (expectedEndDate < today) {
                    throw new BadRequestException(
                        `Task expected end date (${expectedEndDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            // التحقق من تاريخ النهاية الفعلي
            if (taskDto.end_date) {
                const endDate = new Date(taskDto.end_date);
                endDate.setHours(0, 0, 0, 0);

                if (endDate < today) {
                    throw new BadRequestException(
                        `Task end date (${endDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            // التحقق من تاريخ البداية (اختياري - قد تريد السماح بتواريخ بداية في الماضي)
            if (taskDto.start_date) {
                const startDate = new Date(taskDto.start_date);
                startDate.setHours(0, 0, 0, 0);

                // تحذير إذا كان تاريخ البداية في الماضي (بدلاً من منعه)
                if (startDate < today) {
                    console.warn(`Warning: Task start date (${startDate.toDateString()}) is in the past`);
                    // يمكنك تغيير هذا إلى throw إذا كنت تريد منع تواريخ البداية في الماضي أيضاً
                }
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to validate task dates', error.message);
        }
    }

    async canChangeTaskStatus(taskId: string, newStatus: TASK_STATUS): Promise<{ canChange: boolean, reason?: string }> {
        try {
            const task = await this.taskModel.findById(taskId)
                .populate('project_id')
                .exec();

            if (!task) {
                return { canChange: false, reason: 'Task not found' };
            }

            // التحقق من حالة المشروع
            if (task.project_id) {
                const project = task.project_id as any;
                if (project.status === ProjectStatus.COMPLETED) {
                    return {
                        canChange: false,
                        reason: 'Cannot update task status because the associated project is completed'
                    };
                }
            }

            switch (newStatus) {
                case TASK_STATUS.DONE:
                    if (!task.actual_hours || task.actual_hours <= 0) {
                        return {
                            canChange: false,
                            reason: 'Cannot mark task as completed without logging actual hours'
                        };
                    }
                    break;

                case TASK_STATUS.PENDING:
                    if (task.actual_hours && task.actual_hours > 0) {
                        return {
                            canChange: false,
                            reason: `Cannot change to Pending because ${task.actual_hours} actual hours have been logged`
                        };
                    }
                    break;
            }

            return { canChange: true };
        } catch (error) {
            return { canChange: false, reason: 'Error checking status change eligibility' };
        }
    }


    async getTaskWithValidationInfo(taskId: string): Promise<{
        task: GetTaskDto,
        canAddSubtask: boolean,
        canChangeStatus: { [key in TASK_STATUS]: boolean },
        validationMessages: string[]
    }> {
        try {
            const taskResult = await this.getTaskById(taskId);
            if (!taskResult.data) {
                throw new NotFoundException('Task not found');
            }

            const task = taskResult.data;
            const validationMessages: string[] = [];

            // التحقق من إمكانية إضافة مهام فرعية
            const subtaskCheck = await this.canAddSubtask(taskId);
            if (!subtaskCheck.canAdd && subtaskCheck.reason) {
                validationMessages.push(`Subtask: ${subtaskCheck.reason}`);
            }

            // التحقق من إمكانية تغيير الحالة لكل حالة ممكنة
            const statusChecks: { [key in TASK_STATUS]: boolean } = {
                [TASK_STATUS.PENDING]: false,
                [TASK_STATUS.ONGOING]: false,
                [TASK_STATUS.ON_TEST]: false,
                [TASK_STATUS.DONE]: false
            };

            for (const status of Object.values(TASK_STATUS)) {
                const statusCheck = await this.canChangeTaskStatus(taskId, status);
                statusChecks[status] = statusCheck.canChange;

                if (!statusCheck.canChange && statusCheck.reason) {
                    validationMessages.push(`Status ${status}: ${statusCheck.reason}`);
                }
            }

            return {
                task,
                canAddSubtask: subtaskCheck.canAdd,
                canChangeStatus: statusChecks,
                validationMessages
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to get task validation info', error.message);
        }
    }


    /**
 * شرط 5: التحقق من أن الموظف المُسند إليه نشط
 */
    private async validateAssigneeIsActive(employeeId: string): Promise<void> {
        try {
            if (!employeeId) {
                throw new BadRequestException('Employee ID is required');
            }

            const employee = await this.empService.findById(employeeId);

            if (!employee) {
                throw new NotFoundException(`Employee with ID ${employeeId} not found`);
            }

            // التحقق من أن الموظف نشط
            if (!employee.isActive) {
                throw new BadRequestException(
                    `Cannot assign task to inactive employee: ${employee.name || employee.email || employeeId}`
                );
            }

            // التحقق من أن الموظف غير محذوف
            if (employee.isDeleted) {
                throw new BadRequestException(
                    `Cannot assign task to deleted employee: ${employee.name || employee.email || employeeId}`
                );
            }

            // التحقق من تاريخ انتهاء عمل الموظف
            // if (employee.endDate) {
            //     const employeeEndDate = new Date(employee.endDate);
            //     const today = new Date();

            //     employeeEndDate.setHours(23, 59, 59, 999);
            //     today.setHours(0, 0, 0, 0);

            //     if (employeeEndDate < today) {
            //         throw new BadRequestException(
            //             `Cannot assign task to employee whose employment has ended on ${employeeEndDate.toDateString()}: ${employee.full_name || employee.email || employeeId}`
            //         );
            //     }
            // }

            // التحقق من حالة الموظف (إذا كان هناك حقل status)
            if (!employee.isActive) {
                throw new BadRequestException(
                    `Cannot assign task to employee with status '${employee.isActive}': ${employee.name || employee.email || employeeId}`
                );
            }

            // التحقق من أن الموظف لديه قسم
            if (!employee.department_id) {
                throw new BadRequestException(
                    `Cannot assign task to employee without department: ${employee.name || employee.email || employeeId}`
                );
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to validate employee status', error.message);
        }
    }

    async addActualHours(taskId: string, hours: number, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findById(taskId).exec();
            if (!task) {
                throw new NotFoundException('Task not found');
            }

            // التحقق من الصلاحيات
            if (task.emp?.toString() !== userId && task.assignee?.toString() !== userId) {
                throw new ForbiddenException('You are not authorized to add hours to this task');
            }

            // التحقق من صحة الساعات
            if (hours <= 0) {
                throw new BadRequestException('Hours must be greater than 0');
            }

            // التحقق من أن المهمة ليست مكتملة
            if (task.status === TASK_STATUS.DONE) {
                throw new BadRequestException('Cannot add hours to a completed task');
            }

            // إضافة الساعات
            task.actual_hours = (task.actual_hours || 0) + hours;
            task.hasLoggedHours = true;

            // تحديث الوقت الإجمالي المستغرق
            task.totalTimeSpent = (task.totalTimeSpent || 0) + (hours * 3600); // تحويل إلى ثواني

            await task.save();

            return {
                status: true,
                message: `Successfully added ${hours} hours to task. Total actual hours: ${task.actual_hours}`
            };
        } catch (error) {
            if (error instanceof NotFoundException ||
                error instanceof ForbiddenException ||
                error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to add actual hours', error.message);
        }
    }


    async removeActualHours(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findById(taskId).exec();
            if (!task) {
                throw new NotFoundException('Task not found');
            }

            // التحقق من الصلاحيات
            if (task.emp?.toString() !== userId && task.assignee?.toString() !== userId) {
                throw new ForbiddenException('You are not authorized to remove hours from this task');
            }

            // التحقق من أن المهمة ليست مكتملة
            if (task.status === TASK_STATUS.DONE) {
                throw new BadRequestException('Cannot remove hours from a completed task');
            }

            const previousHours = task.actual_hours || 0;

            // إزالة الساعات
            task.actual_hours = 0;
            task.hasLoggedHours = false;
            task.totalTimeSpent = 0;

            await task.save();

            return {
                status: true,
                message: `Successfully removed ${previousHours} hours from task. Task now has no logged hours.`
            };
        } catch (error) {
            if (error instanceof NotFoundException ||
                error instanceof ForbiddenException ||
                error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to remove actual hours', error.message);
        }
    }


    async canAddSubtask(taskId: string): Promise<{ canAdd: boolean, reason?: string }> {
        try {
            const task = await this.taskModel.findById(taskId).exec();
            if (!task) {
                return { canAdd: false, reason: 'Parent task not found' };
            }

            if (task.status === TASK_STATUS.DONE) {
                return { canAdd: false, reason: 'Parent task is completed' };
            }

            if (task.actual_hours && task.actual_hours > 0) {
                return {
                    canAdd: false,
                    reason: `Parent task has ${task.actual_hours} actual hours logged. Remove logged hours first.`
                };
            }

            if (!task.start_date || !task.due_date) {
                return {
                    canAdd: false,
                    reason: 'Parent task must have start date and due date'
                };
            }

            return { canAdd: true };
        } catch (error) {
            return { canAdd: false, reason: 'Error checking subtask eligibility' };
        }
    }

    private async validateSubtaskDatesAgainstParent(subtaskDto: CreateTaskDto, parentTask: TaskDocument): Promise<void> {
        if (!parentTask.start_date || !parentTask.due_date) {
            throw new BadRequestException('Parent task must have start date and due date to add subtasks');
        }

        const parentStartDate = new Date(parentTask.start_date);
        const parentDueDate = new Date(parentTask.due_date);

        parentStartDate.setHours(0, 0, 0, 0);
        parentDueDate.setHours(23, 59, 59, 999);

        // التحقق من تاريخ بداية المهمة الفرعية
        if (subtaskDto.start_date) {
            const subtaskStartDate = new Date(subtaskDto.start_date);
            subtaskStartDate.setHours(0, 0, 0, 0);

            if (subtaskStartDate < parentStartDate) {
                throw new BadRequestException(
                    `Subtask start date (${subtaskStartDate.toDateString()}) cannot be before parent task start date (${parentStartDate.toDateString()})`
                );
            }

            if (subtaskStartDate > parentDueDate) {
                throw new BadRequestException(
                    `Subtask start date (${subtaskStartDate.toDateString()}) cannot be after parent task due date (${parentDueDate.toDateString()})`
                );
            }
        }

        // التحقق من تاريخ استحقاق المهمة الفرعية
        if (subtaskDto.due_date) {
            const subtaskDueDate = new Date(subtaskDto.due_date);
            subtaskDueDate.setHours(23, 59, 59, 999);

            if (subtaskDueDate < parentStartDate) {
                throw new BadRequestException(
                    `Subtask due date (${subtaskDueDate.toDateString()}) cannot be before parent task start date (${parentStartDate.toDateString()})`
                );
            }

            if (subtaskDueDate > parentDueDate) {
                throw new BadRequestException(
                    `Subtask due date (${subtaskDueDate.toDateString()}) cannot be after parent task due date (${parentDueDate.toDateString()})`
                );
            }
        }

        // التحقق من تاريخ النهاية المتوقع
        if (subtaskDto.expected_end_date) {
            const subtaskExpectedEndDate = new Date(subtaskDto.expected_end_date);
            subtaskExpectedEndDate.setHours(23, 59, 59, 999);

            if (subtaskExpectedEndDate > parentDueDate) {
                throw new BadRequestException(
                    `Subtask expected end date (${subtaskExpectedEndDate.toDateString()}) cannot be after parent task due date (${parentDueDate.toDateString()})`
                );
            }
        }
    }
    private async validateEmployeeMembershipForSubtask(
        parentTask: TaskDocument,
        emp: any,
        assigneeId?: string
    ): Promise<void> {
        // التحقق من الموظف المُنشئ للمهمة
        if (parentTask.department_id) {
            const empDepartmentId = emp.department_id._id.toString();
            const parentDepartmentId = parentTask.department_id.toString();

            if (empDepartmentId !== parentDepartmentId) {
                throw new BadRequestException(
                    `Employee must be a member of the same department as the parent task. Parent task department: ${parentDepartmentId}, Employee department: ${empDepartmentId}`
                );
            }
        }

        // التحقق من الموظف المُسند إليه (إذا كان مختلفاً)
        if (assigneeId && assigneeId !== emp._id.toString()) {
            const assignee = await this.empService.findById(assigneeId);
            if (!assignee) {
                throw new NotFoundException(`Assignee with ID ${assigneeId} not found`);
            }

            if (parentTask.department_id) {
                const assigneeDepartmentId = assignee.department_id._id.toString();
                const parentDepartmentId = parentTask.department_id.toString();

                if (assigneeDepartmentId !== parentDepartmentId) {
                    throw new BadRequestException(
                        `Assignee must be a member of the same department as the parent task. Parent task department: ${parentDepartmentId}, Assignee department: ${assigneeDepartmentId}`
                    );
                }
            }

            // إذا كانت المهمة الأب تنتمي لمشروع، تحقق من عضوية الموظف في المشروع
            if (parentTask.project_id) {
                const project = await this.projectService.getProjectById(parentTask.project_id.toString());
                if (project && project.departments && project.departments.length > 0) {
                    const assigneeDepartmentId = assignee.department_id._id.toString();
                    const isAssigneeInProjectDepartments = project.departments.some(
                        (deptId: any) => deptId.toString() === assigneeDepartmentId
                    );

                    if (!isAssigneeInProjectDepartments) {
                        throw new BadRequestException(
                            `Assignee's department must be associated with the project. Project departments: ${project.departments.join(', ')}, Assignee department: ${assigneeDepartmentId}`
                        );
                    }
                }
            }
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
            const task = await this.taskModel.findById(taskId)
                .populate('project_id')
                .exec();

            if (!task) {
                throw new NotFoundException('Task not found');
            }

            // شرط جديد: التحقق من حالة المشروع المرتبط
            if (task.project_id) {
                const project = task.project_id as any;
                if (project.status === ProjectStatus.COMPLETED) {
                    throw new BadRequestException(
                        'Cannot update task status because the associated project is completed'
                    );
                }
            }

            switch (newStatus) {
                case TASK_STATUS.ON_TEST:
                    task.status = TASK_STATUS.ON_TEST;
                    break;

                case TASK_STATUS.DONE:
                    // شرط جديد: لا يمكن إكمال المهمة بدون ساعات فعلية
                    if (!task.actual_hours || task.actual_hours <= 0) {
                        throw new BadRequestException(
                            'Cannot mark task as completed without logging actual hours. Please add actual hours first.'
                        );
                    }

                    if (task.assignee?.toString() !== userId || task.status !== TASK_STATUS.ON_TEST) {
                        throw new BadRequestException('Only the assignee can approve the task, and it must be in test status');
                    }
                    task.status = TASK_STATUS.DONE;
                    break;

                case TASK_STATUS.ONGOING:
                    task.status = TASK_STATUS.ONGOING;
                    break;

                case TASK_STATUS.PENDING:
                    // شرط جديد: لا يمكن إرجاع المهمة لـ Pending إذا تم تسجيل ساعات فعلية
                    if (task.actual_hours && task.actual_hours > 0) {
                        throw new BadRequestException(
                            'Cannot change task status to Pending because actual hours have been logged. Actual hours: ' + task.actual_hours
                        );
                    }
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

            // Get parent tasks with safe population
            const parentTasks = await this.taskModel
                .find(query)
                .populate([
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
                ])
                .lean()
                .exec();

            // Filter out tasks with missing essential data and create DTOs safely
            const taskDtos = parentTasks
                .filter(task => task && task._id) // تأكد من وجود البيانات الأساسية
                .map((task) => {
                    try {
                        return new GetTaskDto(task);
                    } catch (error) {
                        console.error(`Error creating GetTaskDto for task ${task._id}:`, error);
                        return null;
                    }
                })
                .filter(task => task !== null); // إزالة المهام التي فشلت في التحويل

            const fullList: any[] = [];

            // Process each parent task and its subtasks
            for (const task of taskDtos) {
                await this.collectTasksRecursively(task!, fullList);
            }

            return { tree: fullList, info: taskDtos };
        } catch (error) {
            console.error('Error in buildFullTaskList:', error);
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

        try {
            // Get subtasks with safe population
            const subTasks = await this.taskModel
                .find({ parent_task: task.id })
                .populate([
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
                ])
                .lean()
                .exec();

            // Process subtasks safely
            const subTaskDtos = subTasks
                .filter(subTask => subTask && subTask._id)
                .map((subTask) => {
                    try {
                        return new GetTaskDto(subTask);
                    } catch (error) {
                        console.error(`Error creating GetTaskDto for subtask ${subTask._id}:`, error);
                        return null;
                    }
                })
                .filter(subTask => subTask !== null);

            // Process each subtask recursively
            for (const subTask of subTaskDtos) {
                await this.collectTasksRecursively(subTask!, fullList);
            }
        } catch (error) {
            console.error(`Error processing subtasks for task ${task.id}:`, error);
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