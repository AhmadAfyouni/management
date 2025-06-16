import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schema/task.schema';
import { NotificationService } from '../notification/notification.service';
import { ProjectStatus } from '../project/enums/project-status';
import { TASK_STATUS } from './enums/task-status.enum';

@Injectable()
export class TaskStatusService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly notificationService: NotificationService,
    ) { }

    async updateTaskStatus(taskId: string, userId: string, newStatus: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findById(taskId)
                .populate('project_id')
                .exec();

            if (!task) {
                throw new NotFoundException('Task not found');
            }

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

            if (task.parent_task) {
                await this.checkAndUpdateParentTaskStatus(task.parent_task.toString(), newStatus, userId);
            }

            return { status: true, message: `Task status updated to ${newStatus}` };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task status', error.message);
        }
    }

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

    async canChangeTaskStatus(taskId: string, newStatus: string): Promise<{ canChange: boolean, reason?: string }> {
        try {
            const task = await this.taskModel.findById(taskId)
                .populate('project_id')
                .exec();

            if (!task) {
                return { canChange: false, reason: 'Task not found' };
            }

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

    async checkAndUpdateParentTaskStatus(parentTaskId: string, subtaskStatus: string, empId: string): Promise<void> {
        const parentTask = await this.taskModel.findById(parentTaskId);
        if (!parentTask) {
            return;
        }

        const subtasks = await this.taskModel.find({ parent_task: parentTaskId }).exec();
        if (subtasks.length === 0) {
            return;
        }

        const statusHierarchy: TASK_STATUS[] = [TASK_STATUS.ONGOING, TASK_STATUS.PENDING, TASK_STATUS.ON_TEST, TASK_STATUS.DONE];

        if (subtaskStatus === TASK_STATUS.DONE) {
            const allSubtasksDone = subtasks.every(subtask => subtask.status === TASK_STATUS.DONE);

            if (allSubtasksDone && parentTask.emp?.toString() === empId) {
                parentTask.status = TASK_STATUS.DONE;
                await parentTask.save();

                await this.notificationService.notifyTaskStatusChanged(parentTask, empId);

                if (parentTask.parent_task) {
                    await this.checkAndUpdateParentTaskStatus(parentTask.parent_task.toString(), TASK_STATUS.DONE, empId);
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
                await parentTask.save();

                await this.notificationService.notifyTaskStatusChanged(parentTask, empId);

                if (parentTask.parent_task) {
                    await this.checkAndUpdateParentTaskStatus(parentTask.parent_task.toString(), minStatus, empId);
                }
            }
        }
    }
}