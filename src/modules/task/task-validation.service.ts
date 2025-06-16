import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { Task, TaskDocument } from './schema/task.schema';
import { ProjectService } from '../project/project.service';
import { EmpService } from '../emp/emp.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { ProjectStatus } from '../project/enums/project-status';
import { WorkDay } from '../company-settings/schemas/company-settings.schema';

@Injectable()
export class TaskValidationService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
        @Inject(forwardRef(() => ProjectService))
        private readonly projectService: ProjectService,
        private readonly companySettingsService: CompanySettingsService,
    ) { }

    async calculateWorkingHoursBetweenDates(startDate: Date, endDate: Date): Promise<number> {
        try {
            return await this.companySettingsService.calculateEstimatedHours(startDate, endDate);
        } catch (error) {
            console.error('Error calculating working hours:', error);
            const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffInDays * 8;
        }
    }

    async calculateWorkingDaysBetweenDates(startDate: Date, endDate: Date): Promise<number> {
        try {
            return await this.companySettingsService.calculateWorkingDaysBetween(startDate, endDate);
        } catch (error) {
            console.error('Error calculating working days:', error);
            return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    async isWorkingDay(date: Date): Promise<boolean> {
        try {
            const dayWorkingHours = await this.companySettingsService.getDayWorkingHours();
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;
            const dayConfig = dayWorkingHours.find(day => day.day === dayName);
            return dayConfig ? dayConfig.isWorkingDay : false;
        } catch (error) {
            console.error('Error checking working day:', error);
            const dayOfWeek = date.getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 5;
        }
    }

    async getWorkingHoursForSpecificDay(date: Date): Promise<number> {
        try {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;
            return await this.companySettingsService.getWorkingHoursForDay(dayName);
        } catch (error) {
            console.error('Error getting working hours for day:', error);
            return 8;
        }
    }

    async findNextWorkingDay(date: Date): Promise<Date> {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        let attempts = 0;
        while (attempts < 14) {
            if (await this.isWorkingDay(nextDay)) {
                return nextDay;
            }
            nextDay.setDate(nextDay.getDate() + 1);
            attempts++;
        }

        return nextDay;
    }

    async findPreviousWorkingDay(date: Date): Promise<Date> {
        const previousDay = new Date(date);
        previousDay.setDate(previousDay.getDate() - 1);

        let attempts = 0;
        while (attempts < 14) {
            if (await this.isWorkingDay(previousDay)) {
                return previousDay;
            }
            previousDay.setDate(previousDay.getDate() - 1);
            attempts++;
        }

        return previousDay;
    }

    async validateTaskDatesWithWorkingHours(taskDto: CreateTaskDto | UpdateTaskDto | any): Promise<void> {
        await this.validateTaskDatesNotInPast(taskDto);

        if (taskDto.start_date) {
            const startDate = new Date(taskDto.start_date);
            const isStartWorkingDay = await this.isWorkingDay(startDate);

            if (!isStartWorkingDay) {
                const nextWorkingDay = await this.findNextWorkingDay(startDate);
                console.warn(
                    `Task start date (${startDate.toDateString()}) is not a working day. ` +
                    `Consider moving to next working day: ${nextWorkingDay.toDateString()}`
                );
            }
        }

        if (taskDto.due_date) {
            const dueDate = new Date(taskDto.due_date);
            const isDueWorkingDay = await this.isWorkingDay(dueDate);

            if (!isDueWorkingDay) {
                const previousWorkingDay = await this.findPreviousWorkingDay(dueDate);
                console.warn(
                    `Task due date (${dueDate.toDateString()}) is not a working day. ` +
                    `Consider moving to previous working day: ${previousWorkingDay.toDateString()}`
                );
            }
        }

        if (taskDto.start_date && taskDto.due_date && taskDto.estimated_hours) {
            const availableHours = await this.calculateWorkingHoursBetweenDates(
                new Date(taskDto.start_date),
                new Date(taskDto.due_date)
            );

            if (taskDto.estimated_hours > availableHours) {
                throw new BadRequestException(
                    `Estimated hours (${taskDto.estimated_hours}) exceed available working hours (${availableHours}) between start and due dates. ` +
                    `Please adjust the dates or estimated hours.`
                );
            }
        }
    }

    async autoCalculateEstimatedHours(taskDto: CreateTaskDto | UpdateTaskDto): Promise<void> {
        if (taskDto.start_date && taskDto.due_date && !taskDto.estimated_hours) {
            try {
                const calculatedHours = await this.calculateWorkingHoursBetweenDates(
                    new Date(taskDto.start_date),
                    new Date(taskDto.due_date)
                );

                taskDto.estimated_hours = Math.max(1, Math.round(calculatedHours));
                console.log(`Auto-calculated estimated hours: ${taskDto.estimated_hours} based on working schedule`);
            } catch (error) {
                console.error('Error auto-calculating estimated hours:', error);
            }
        }
    }

    async validateTaskDatesNotInPast(taskDto: CreateTaskDto | UpdateTaskDto | any): Promise<void> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (taskDto.due_date) {
                const dueDate = new Date(taskDto.due_date);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate < today) {
                    throw new BadRequestException(
                        `Task due date (${dueDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            if (taskDto.expected_end_date) {
                const expectedEndDate = new Date(taskDto.expected_end_date);
                expectedEndDate.setHours(0, 0, 0, 0);

                if (expectedEndDate < today) {
                    throw new BadRequestException(
                        `Task expected end date (${expectedEndDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

            if (taskDto.end_date) {
                const endDate = new Date(taskDto.end_date);
                endDate.setHours(0, 0, 0, 0);

                if (endDate < today) {
                    throw new BadRequestException(
                        `Task end date (${endDate.toDateString()}) cannot be in the past. Please select today or a future date.`
                    );
                }
            }

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

    async validateTaskDatesAgainstProject(taskDto: CreateTaskDto | UpdateTaskDto | any, project: any): Promise<void> {
        try {
            if (!project.startDate || !project.endDate) {
                throw new BadRequestException('Project must have start date and end date defined');
            }

            const projectStartDate = new Date(project.startDate);
            const projectEndDate = new Date(project.endDate);

            projectStartDate.setHours(0, 0, 0, 0);
            projectEndDate.setHours(23, 59, 59, 999);

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

    async validateSubtaskDatesAgainstParent(subtaskDto: CreateTaskDto, parentTask: TaskDocument): Promise<void> {
        if (!parentTask.start_date || !parentTask.due_date) {
            throw new BadRequestException('Parent task must have start date and due date to add subtasks');
        }

        const parentStartDate = new Date(parentTask.start_date);
        const parentDueDate = new Date(parentTask.due_date);

        parentStartDate.setHours(0, 0, 0, 0);
        parentDueDate.setHours(23, 59, 59, 999);

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

        if (subtaskDto.start_date && subtaskDto.due_date && subtaskDto.estimated_hours) {
            const availableHours = await this.calculateWorkingHoursBetweenDates(
                new Date(subtaskDto.start_date),
                new Date(subtaskDto.due_date)
            );

            if (subtaskDto.estimated_hours > availableHours) {
                throw new BadRequestException(
                    `Subtask estimated hours (${subtaskDto.estimated_hours}) exceed available working hours (${availableHours}) between start and due dates.`
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

    async validateUniqueTaskNameInProject(taskName: string, projectId: string, excludeTaskId?: string): Promise<void> {
        try {
            if (!taskName || !taskName.trim()) {
                throw new BadRequestException('Task name is required');
            }

            const query: any = {
                name: { $regex: new RegExp(`^${taskName.trim()}$`, 'i') },
                project_id: projectId,
                isActive: true
            };

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

    async validateAssigneeIsActive(employeeId: string): Promise<void> {
        try {
            if (!employeeId) {
                throw new BadRequestException('Employee ID is required');
            }

            const employee = await this.empService.findById(employeeId);

            if (!employee) {
                throw new NotFoundException(`Employee with ID ${employeeId} not found`);
            }

            if (!employee.isActive) {
                throw new BadRequestException(
                    `Cannot assign task to inactive employee: ${employee.name || employee.email || employeeId}`
                );
            }

            if (employee.isDeleted) {
                throw new BadRequestException(
                    `Cannot assign task to deleted employee: ${employee.name || employee.email || employeeId}`
                );
            }

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

    async validateEmployeeMembershipForSubtask(parentTask: TaskDocument, emp: any, assigneeId?: string): Promise<void> {
        if (parentTask.department_id) {
            const empDepartmentId = emp.department_id._id.toString();
            const parentDepartmentId = parentTask.department_id.toString();

            if (empDepartmentId !== parentDepartmentId) {
                throw new BadRequestException(
                    `Employee must be a member of the same department as the parent task. Parent task department: ${parentDepartmentId}, Employee department: ${empDepartmentId}`
                );
            }
        }

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

    async validateTaskUpdate(task: TaskDocument, updateTaskDto: UpdateTaskDto, empId: string): Promise<void> {
        const oldStatus = task.status;

        if (task.project_id) {
            const project = task.project_id as any;
            if (project.status === ProjectStatus.COMPLETED) {
                throw new BadRequestException(
                    'Cannot update task because the associated project is completed'
                );
            }
        }

        if (task.status === 'DONE' && oldStatus !== 'DONE') {
            throw new ForbiddenException('You are not authorized to update this task because it is done');
        }

        if (updateTaskDto.assignee) {
            await this.validateAssigneeIsActive(updateTaskDto.assignee);
        }

        if (this.hasDateUpdates(updateTaskDto)) {
            await this.autoCalculateEstimatedHours(updateTaskDto);
            const mergedDates = this.mergeTaskDates(task, updateTaskDto);
            await this.validateTaskDatesWithWorkingHours(mergedDates);

            if (task.project_id) {
                const project = await this.projectService.getProjectById(task.project_id.toString());
                if (project) {
                    await this.validateTaskDatesAgainstProject(mergedDates, project);
                }
            }
        }

        if (updateTaskDto.name && updateTaskDto.name !== task.name && task.project_id) {
            await this.validateUniqueTaskNameInProject(updateTaskDto.name, task.project_id.toString(), task._id.toString());
        }

        if (updateTaskDto.status && updateTaskDto.status !== oldStatus) {
            if (updateTaskDto.status === 'DONE') {
                if (!updateTaskDto.actual_hours || updateTaskDto.actual_hours <= 0) {
                    throw new BadRequestException(
                        'Cannot mark task as completed without logging actual hours. Please add actual hours first.'
                    );
                }
            }

            if (updateTaskDto.status === 'PENDING') {
                if ((task.actual_hours && task.actual_hours > 0) || task.timeLogs.length == 0) {
                    throw new BadRequestException(
                        'Cannot change task status to Pending because actual hours have been logged. Actual hours: ' + task.actual_hours
                    );
                }
            }

            const hasSubtasks = await this.taskModel.exists({ parent_task: task._id });
            if (hasSubtasks) {
                if (updateTaskDto.status === 'DONE') {
                    const allSubtasksDone = await this.areAllSubtasksDone(task._id.toString());
                    if (!allSubtasksDone) {
                        throw new BadRequestException('Cannot mark task as done until all subtasks are completed');
                    }
                } else {
                    throw new BadRequestException('Cannot update status for a task with subtasks');
                }
            }

            if (updateTaskDto.status === 'DONE') {
                if (task.assignee?.toString() !== empId) {
                    throw new ForbiddenException('You are not authorized to mark this task as done');
                }
            }

            if (task.emp?.toString() !== empId) {
                throw new ForbiddenException('You are not authorized to update this task status');
            }
        }

        if (updateTaskDto.priority && task.assignee?.toString() !== empId) {
            updateTaskDto.priority = undefined;
        }

        if (updateTaskDto.due_date) {
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

    private async areAllSubtasksDone(taskId: string): Promise<boolean> {
        const subtasks = await this.taskModel.find({ parent_task: taskId }).exec();

        if (subtasks.length === 0) {
            return true;
        }

        return subtasks.every(subtask => subtask.status === 'DONE');
    }
}