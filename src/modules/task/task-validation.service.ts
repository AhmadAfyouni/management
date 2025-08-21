import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { Task, TaskDocument } from './schema/task.schema';
import { ProjectService } from '../project/project.service';
import { EmpService } from '../emp/emp.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { ProjectStatus } from '../project/enums/project-status';
import { WorkDay } from '../company-settings/schemas/company-settings.schema';
import { TASK_STATUS } from './enums/task-status.enum';

@Injectable()
export class TaskValidationService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
        @Inject(forwardRef(() => ProjectService))
        private readonly projectService: ProjectService,
        private readonly companySettingsService: CompanySettingsService,
    ) { }

    // ===================== WORKING HOURS CALCULATIONS =====================

    /**
     * Calculates working hours between two dates using company settings
     */
    async calculateWorkingHoursBetweenDates(startDate: Date, endDate: Date): Promise<number> {
        try {
            return await this.companySettingsService.calculateEstimatedHours(startDate, endDate);
        } catch (error) {
            console.error('Error calculating working hours:', error);
            const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffInDays * 8; // Default 8 hours per day
        }
    }

    /**
     * Calculates working days between two dates using company settings
     */
    async calculateWorkingDaysBetweenDates(startDate: Date, endDate: Date): Promise<number> {
        try {
            return await this.companySettingsService.calculateWorkingDaysBetween(startDate, endDate);
        } catch (error) {
            console.error('Error calculating working days:', error);
            return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    /**
     * Gets working hours for a specific day
     */
    async getWorkingHoursForSpecificDay(date: Date): Promise<number> {
        try {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;
            return await this.companySettingsService.getWorkingHoursForDay(dayName);
        } catch (error) {
            console.error('Error getting working hours for day:', error);
            return 8; // Default fallback
        }
    }

    /**
     * Auto-calculates estimated hours based on task dates and working hours
     */
    async autoCalculateEstimatedHours(taskDto: CreateTaskDto | UpdateTaskDto): Promise<void> {
        if (taskDto.start_date && taskDto.due_date && !taskDto.estimated_hours) {
            try {
                const calculatedHours = await this.calculateWorkingHoursBetweenDates(
                    new Date(taskDto.start_date),
                    new Date(taskDto.due_date)
                );

                taskDto.estimated_hours = Math.max(1, Math.round(calculatedHours)); // Minimum 1 hour
                console.log(`Auto-calculated estimated hours: ${taskDto.estimated_hours} based on working schedule`);
            } catch (error) {
                console.error('Error auto-calculating estimated hours:', error);
            }
        }
    }

    // ===================== WORKING DAY CHECKS =====================

    /**
     * Validates if the given date is a working day
     */
    async isWorkingDay(date: Date): Promise<boolean> {
        try {
            const dayWorkingHours = await this.companySettingsService.getDayWorkingHours();
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;

            const dayConfig = dayWorkingHours.find(day => day.day === dayName);
            const isWorkingDay = dayConfig ? dayConfig.isWorkingDay : false;

            // Also check if it's a holiday
            const isHoliday = await this.isHoliday(date);

            return isWorkingDay && !isHoliday;
        } catch (error) {
            console.error('Error checking working day:', error);
            // Fallback: assume Monday-Friday are working days
            const dayOfWeek = date.getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 5;
        }
    }

    /**
     * Checks if the given date is a holiday
     */
    async isHoliday(date: Date): Promise<boolean> {
        try {
            const holidays = await this.companySettingsService.getHolidays();
            return holidays.some(holiday => {
                const holidayDate = new Date(holiday);
                return holidayDate.toDateString() === date.toDateString();
            });
        } catch (error) {
            console.error('Error checking holiday:', error);
            return false; // Fallback: assume no holidays
        }
    }

    /**
     * Finds the next working day from a given date
     */
    async findNextWorkingDay(date: Date): Promise<Date> {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        let attempts = 0;
        while (attempts < 14) { // Prevent infinite loop
            if (await this.isWorkingDay(nextDay)) {
                return nextDay;
            }
            nextDay.setDate(nextDay.getDate() + 1);
            attempts++;
        }

        return nextDay; // Fallback
    }

    /**
     * Finds the previous working day from a given date
     */
    async findPreviousWorkingDay(date: Date): Promise<Date> {
        const previousDay = new Date(date);
        previousDay.setDate(previousDay.getDate() - 1);

        let attempts = 0;
        while (attempts < 14) { // Prevent infinite loop
            if (await this.isWorkingDay(previousDay)) {
                return previousDay;
            }
            previousDay.setDate(previousDay.getDate() - 1);
            attempts++;
        }

        return previousDay; // Fallback
    }

    // ===================== DATE VALIDATIONS =====================

    /**
     * Validates that dates are not in the past
     */
    async validateTaskDatesNotInPast(taskDto: CreateTaskDto | UpdateTaskDto | any): Promise<void> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Validate due date
            if (taskDto.due_date) {
                const dueDate = new Date(taskDto.due_date);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate < today) {
                    throw new BadRequestException(
                        `Task due date (${dueDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            // Validate expected end date
            if (taskDto.expected_end_date) {
                const expectedEndDate = new Date(taskDto.expected_end_date);
                expectedEndDate.setHours(0, 0, 0, 0);

                if (expectedEndDate < today) {
                    throw new BadRequestException(
                        `Task expected end date (${expectedEndDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            // Validate actual end date
            if (taskDto.end_date) {
                const endDate = new Date(taskDto.end_date);
                endDate.setHours(0, 0, 0, 0);

                if (endDate < today) {
                    throw new BadRequestException(
                        `Task end date (${endDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            // Validate start date (warning only)
            if (taskDto.start_date) {
                const startDate = new Date(taskDto.start_date);
                startDate.setHours(0, 0, 0, 0);

                if (startDate < today) {
                    console.warn(`Warning: Task start date (${startDate.toDateString()}) is in the past`);
                }
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to validate task dates', error.message);
        }
    }

    /**
     * Enhanced date validation that considers working days and hours
     */
    async validateTaskDatesWithWorkingHours(taskDto: CreateTaskDto | UpdateTaskDto | any): Promise<void> {
        // First run the existing validation
        await this.validateTaskDatesNotInPast(taskDto);

        // Additional validation for working days
        if (taskDto.start_date) {
            const startDate = new Date(taskDto.start_date);
            const isStartWorkingDay = await this.isWorkingDay(startDate);

            if (!isStartWorkingDay) {
                // Check if it's a holiday
                const isHoliday = await this.isHoliday(startDate);
                if (isHoliday) {
                    console.warn(
                        `Task start date (${startDate.toDateString()}) is a holiday. ` +
                        `Please check and adjust accordingly.`
                    );
                } else {
                    // Find next working day
                    const nextWorkingDay = await this.findNextWorkingDay(startDate);
                    console.warn(
                        `Task start date (${startDate.toDateString()}) is not a working day. ` +
                        `Consider moving to next working day: ${nextWorkingDay.toDateString()}`
                    );
                }
            }
        }

        if (taskDto.due_date) {
            const dueDate = new Date(taskDto.due_date);
            const isDueWorkingDay = await this.isWorkingDay(dueDate);

            if (!isDueWorkingDay) {
                // Check if it's a holiday
                const isHoliday = await this.isHoliday(dueDate);
                if (isHoliday) {
                    console.warn(
                        `Task due date (${dueDate.toDateString()}) is a holiday. ` +
                        `Please check and adjust accordingly.`
                    );
                } else {
                    const previousWorkingDay = await this.findPreviousWorkingDay(dueDate);
                    console.warn(
                        `Task due date (${dueDate.toDateString()}) is not a working day. ` +
                        `Consider moving to previous working day: ${previousWorkingDay.toDateString()}`
                    );
                }
            }
        }

        // Validate estimated hours against working time between dates
        if (taskDto.start_date && taskDto.due_date && taskDto.estimated_hours) {
            const availableHours = await this.calculateWorkingHoursBetweenDates(
                new Date(taskDto.start_date),
                new Date(taskDto.due_date)
            );

            // Round available hours to 2 decimal places for better comparison
            const roundedAvailableHours = Math.round(availableHours * 100) / 100;

            // Check if available hours is 0 (likely a holiday)
            if (roundedAvailableHours === 0) {
                throw new BadRequestException(
                    'The selected date may be a holiday. Please check and adjust accordingly.'
                );
            }

            if (taskDto.estimated_hours > roundedAvailableHours) {
                throw new BadRequestException(
                    `Estimated hours (${taskDto.estimated_hours}) exceed available working hours (${roundedAvailableHours}) between start and due dates. ` +
                    `Please adjust the dates or estimated hours.`
                );
            }
        }
    }

    // ===================== PROJECT VALIDATIONS =====================

    /**
     * Validates task dates against project dates
     */
    async validateTaskDatesAgainstProject(
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

            // Validate task start date
            if (taskDto.start_date) {
                const taskStartDate = new Date(taskDto.start_date);
                taskStartDate.setHours(0, 0, 0, 0);

                // if (taskStartDate < projectStartDate) {
                //     throw new BadRequestException(
                //         `Task start date (${taskStartDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`
                //     );
                // }

                if (taskStartDate > projectEndDate) {
                    throw new BadRequestException(
                        `Task start date (${taskStartDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`
                    );
                }
            }

            // Validate task due date
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

            // Validate expected end date
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

            // Validate actual end date
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

            // Validate logical date order
            this.validateDateLogicalOrder(taskDto);

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to validate task dates against project', error.message);
        }
    }

    /**
     * Validates project requirement (project must be IN_PROGRESS)
     */
    async validateOngoingProjectRequirement(projectId: string): Promise<void> {
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

    // ===================== SUBTASK VALIDATIONS =====================

    /**
     * Enhanced subtask validation with working hours
     */
    async validateSubtaskDatesAgainstParent(subtaskDto: CreateTaskDto, parentTask: TaskDocument): Promise<void> {
        if (!parentTask.start_date || !parentTask.due_date) {
            throw new BadRequestException('Parent task must have start date and due date to add subtasks');
        }

        const parentStartDate = new Date(parentTask.start_date);
        const parentDueDate = new Date(parentTask.due_date);

        parentStartDate.setHours(0, 0, 0, 0);
        parentDueDate.setHours(23, 59, 59, 999);

        // Validate subtask dates are within parent task range
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

        // Calculate available working hours for subtask
        if (subtaskDto.start_date && subtaskDto.due_date && subtaskDto.estimated_hours) {
            const availableHours = await this.calculateWorkingHoursBetweenDates(
                new Date(subtaskDto.start_date),
                new Date(subtaskDto.due_date)
            );

            // Round available hours to 2 decimal places for better comparison
            const roundedAvailableHours = Math.round(availableHours * 100) / 100;

            // Check if available hours is 0 (likely a holiday)
            if (roundedAvailableHours === 0) {
                throw new BadRequestException(
                    'The selected date may be a holiday. Please check and adjust accordingly.'
                );
            }

            if (subtaskDto.estimated_hours > roundedAvailableHours) {
                throw new BadRequestException(
                    `Subtask estimated hours (${subtaskDto.estimated_hours}) exceed available working hours (${roundedAvailableHours}) between start and due dates.`
                );
            }
        }

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

    // ===================== EMPLOYEE VALIDATIONS =====================

    /**
     * Validates that assignee is active
     */
    async validateAssigneeIsActive(employeeId: string): Promise<void> {
        try {
            if (!employeeId) {
                throw new BadRequestException('Employee ID is required');
            }

            const employee = await this.empService.findById(employeeId);

            if (!employee) {
                throw new NotFoundException(`Employee with ID ${employeeId} not found`);
            }

            // Check if employee is active
            if (!employee.isActive) {
                throw new BadRequestException(
                    `Cannot assign task to inactive employee: ${employee.name || employee.email || employeeId}`
                );
            }

            // Check if employee is not deleted
            if (employee.isDeleted) {
                throw new BadRequestException(
                    `Cannot assign task to deleted employee: ${employee.name || employee.email || employeeId}`
                );
            }

            // Check if employee has a department
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

    /**
     * Validates employee membership for subtask
     */
    async validateEmployeeMembershipForSubtask(
        parentTask: TaskDocument,
        emp: any,
        assigneeId?: string
    ): Promise<void> {
        // Check creating employee
        if (parentTask.department_id) {
            const empDepartmentId = emp.department_id._id.toString();
            const parentDepartmentId = parentTask.department_id._id.toString();

            if (empDepartmentId !== parentDepartmentId) {
                throw new BadRequestException(
                    `Employee must be a member of the same department as the parent task. Parent task department: ${parentDepartmentId}, Employee department: ${empDepartmentId}`
                );
            }
        }

        // Check assignee (if different)
        if (assigneeId && assigneeId !== emp._id.toString()) {
            const assignee = await this.empService.findById(assigneeId);
            if (!assignee) {
                throw new NotFoundException(`Assignee with ID ${assigneeId} not found`);
            }

            if (parentTask.department_id) {
                const assigneeDepartmentId = assignee.department_id._id.toString();
                const parentDepartmentId = parentTask.department_id._id.toString();
                const assigneeDepartmentName = (assignee.department_id as any).name;
                const parentDepartmentName = (parentTask.department_id as any).name;
                if (assigneeDepartmentId !== parentDepartmentId) {
                    throw new BadRequestException(
                        `Assignee must be a member of the same department as the parent task. Parent task department: ${parentDepartmentName}, Assignee department: ${assigneeDepartmentName}`
                    );
                }
            }

            // If parent task belongs to project, check employee membership in project
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

    // ===================== TASK NAME VALIDATION =====================

    /**
     * Validates unique task name in project
     */
    async validateUniqueTaskNameInProject(
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

            // Exclude current task in case of update
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

    // ===================== TASK UPDATE VALIDATION =====================

    /**
     * Comprehensive task update validation
     */
    async validateTaskUpdate(task: TaskDocument, updateTaskDto: UpdateTaskDto, empId: string): Promise<void> {
        const oldStatus = task.status;

        // Check project status
        if (task.project_id) {
            const project = task.project_id as any;
            if (project.status === ProjectStatus.COMPLETED) {
                throw new BadRequestException(
                    'Cannot update task because the associated project is completed'
                );
            }
        }
        console.log("STEP 1");


        // Check if task is completed
        if (task.status === TASK_STATUS.DONE && oldStatus !== TASK_STATUS.DONE) {
            throw new ForbiddenException('You are not authorized to update this task because it is done');
        }
        console.log("STEP 2");

        // Validate assignee if updated
        if (updateTaskDto.assignee) {
            await this.validateAssigneeIsActive(updateTaskDto.assignee);
        }
        console.log("STEP 3");
        // Auto-calculate and validate dates with working hours
        if (this.hasDateUpdates(updateTaskDto)) {
            await this.autoCalculateEstimatedHours(updateTaskDto);
            console.log("STEP 4");
            const mergedDates = this.mergeTaskDates(task, updateTaskDto);
            // await this.validateTaskDatesWithWorkingHours(mergedDates);
            console.log("STEP 5");
            // if (task.project_id) {
            //     const project = await this.projectService.getProjectById(task.project_id._id.toString());
            //     if (project) {
            //         // await this.validateTaskDatesAgainstProject(mergedDates, project);
            //     }
            // }
        }
        console.log("STEP 6");
        // Validate unique task name in project
        // if (updateTaskDto.name && updateTaskDto.name !== task.name && task.project_id) {
        //     await this.validateUniqueTaskNameInProject(
        //         updateTaskDto.name,
        //         task.project_id.toString(),
        //         task._id.toString()
        //     );
        // }
        console.log("STEP 7");
        // Enhanced status update validation
        await this.validateStatusUpdate(task, updateTaskDto, empId, oldStatus);
        console.log("STEP 8");
        // Priority update validation
        if (updateTaskDto.priority && task.assignee?.toString() !== empId) {
            updateTaskDto.priority = undefined;
        }
        console.log("STEP 9");
        // Handle due date updates for subtasks
        await this.handleSubtaskDueDateUpdates(task, updateTaskDto);
    }

    // ===================== STATUS VALIDATION =====================

    /**
     * Checks if task status can be changed
     */
    async canChangeTaskStatus(taskId: string, newStatus: TASK_STATUS): Promise<{ canChange: boolean, reason?: string }> {
        try {
            const task = await this.taskModel.findById(taskId)
                .populate('project_id')
                .exec();

            if (!task) {
                return { canChange: false, reason: 'Task not found' };
            }

            // Check project status
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

    /**
     * Checks if subtask can be added to a task
     */
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

    // ===================== PRIVATE HELPER METHODS =====================

    /**
     * Validates logical date order
     */
    private validateDateLogicalOrder(taskDto: CreateTaskDto | UpdateTaskDto | any): void {
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
    }

    /**
     * Validates status update with comprehensive checks
     */
    private async validateStatusUpdate(
        task: TaskDocument,
        updateTaskDto: UpdateTaskDto,
        empId: string,
        oldStatus: TASK_STATUS
    ): Promise<void> {
        if (!updateTaskDto.status || updateTaskDto.status === oldStatus) {
            return; // No status change
        }

        // Status-specific validations
        if (updateTaskDto.status === TASK_STATUS.DONE) {
            if (!updateTaskDto.actual_hours || updateTaskDto.actual_hours <= 0) {
                throw new BadRequestException(
                    'Cannot mark task as completed without logging actual hours. Please add actual hours first.'
                );
            }
        }

        if (updateTaskDto.status === TASK_STATUS.PENDING) {
            if ((task.actual_hours && task.actual_hours > 0) || task.timeLogs.length === 0) {
                throw new BadRequestException(
                    'Cannot change task status to Pending because actual hours have been logged. Actual hours: ' + task.actual_hours
                );
            }
        }

        // Check subtasks
        const hasSubtasks = await this.taskModel.exists({ parent_task: task._id });
        if (hasSubtasks) {
            if (updateTaskDto.status === TASK_STATUS.DONE) {
                const allSubtasksDone = await this.areAllSubtasksDone(task._id.toString());
                if (!allSubtasksDone) {
                    throw new BadRequestException('Cannot mark task as done until all subtasks are completed');
                }
            } else {
                throw new BadRequestException('Cannot update status for a task with subtasks');
            }
        }

        // Permission checks
        if (updateTaskDto.status === TASK_STATUS.DONE) {
            if (task.assignee?.toString() !== empId) {
                throw new ForbiddenException('You are not authorized to mark this task as done');
            }
        }

        // if (task.emp?.toString() !== empId) {
        //     throw new ForbiddenException(`You are not authorized to update this task status  ${task.emp?.toString()} not equal to ${empId}`);
        // }
    }

    /**
     * Handles due date updates for subtasks
     */
    private async handleSubtaskDueDateUpdates(task: TaskDocument, updateTaskDto: UpdateTaskDto): Promise<void> {
        if (!updateTaskDto.due_date) {
            return;
        }

        const subTasks = await this.taskModel.find({ parent_task: task._id }).exec();
        await Promise.all(
            subTasks.map(async (subTask) => {
                if (new Date(subTask.due_date!) > new Date(updateTaskDto.due_date!)) {
                    subTask.due_date = updateTaskDto.due_date!;
                    await subTask.save();
                }
            })
        );
    }

    /**
     * Merges task dates for validation
     */
    private mergeTaskDates(currentTask: any, updateDto: UpdateTaskDto): any {
        return {
            start_date: updateDto.start_date || currentTask.start_date,
            due_date: updateDto.due_date || currentTask.due_date,
            expected_end_date: updateDto.expected_end_date || currentTask.expected_end_date,
            end_date: updateDto.end_date || currentTask.end_date,
            name: updateDto.name || currentTask.name,
            estimated_hours: updateDto.estimated_hours || currentTask.estimated_hours
        };
    }

    /**
     * Checks if update DTO has date updates
     */
    private hasDateUpdates(updateDto: UpdateTaskDto): boolean {
        return !!(
            updateDto.start_date ||
            updateDto.due_date ||
            updateDto.expected_end_date ||
            updateDto.end_date
        );
    }

    /**
     * Checks if all subtasks of a task are done
     */
    private async areAllSubtasksDone(taskId: string): Promise<boolean> {
        const subtasks = await this.taskModel.find({ parent_task: taskId }).exec();

        if (subtasks.length === 0) {
            return true; // No subtasks means all are done
        }

        // Check if all subtasks are DONE
        return subtasks.every(subtask => subtask.status === TASK_STATUS.DONE);
    }
}