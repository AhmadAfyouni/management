import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TASK_STATUS } from './enums/task-status.enum';
import { Task, TaskDocument } from './schema/task.schema';

@Injectable()
export class TaskTimeTrackingService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    ) { }

    async startTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findOne({ _id: new Types.ObjectId(taskId) });
            if (!task) {
                throw new NotFoundException('Task not found');
            }

            const lastLog = task.timeLogs?.[task.timeLogs.length - 1];
            if (lastLog && !lastLog.end) {
                throw new BadRequestException('This task is already started');
            }

            const runningTasks = await this.taskModel.find({
                'timeLogs': { $elemMatch: { end: null } },
                emp: userId
            });

            for (const runningTask of runningTasks) {
                if (runningTask._id.toString() !== taskId) {
                    await this.pauseTask(runningTask._id.toString(), userId);
                }
            }

            task.timeLogs = task.timeLogs || [];
            task.timeLogs.push({ start: new Date(), end: undefined });

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

    async pauseTask(taskId: string, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findOne({ _id: new Types.ObjectId(taskId) });
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

            // Calculate time difference in milliseconds and convert to seconds
            const timeDiffInMilliseconds = now.getTime() - lastLog.start.getTime();
            const timeDiffInSeconds = Math.round(timeDiffInMilliseconds / 1000);

            // Update totalTimeSpent (in seconds)
            task.totalTimeSpent = (task.totalTimeSpent || 0) + parseFloat(timeDiffInSeconds.toFixed(2));

            // Automatically calculate and update actual_hours
            const hoursWorked = timeDiffInSeconds / 3600; // Convert seconds to hours
            task.actual_hours = (task.actual_hours || 0) + parseFloat(hoursWorked.toFixed(4)); // Keep precision for small time periods

            // Set hasLoggedHours flag to true since we're automatically logging hours
            task.hasLoggedHours = true;

            await task.save();

            return {
                status: true,
                message: `Task paused successfully. Added ${hoursWorked.toFixed(2)} hours to actual_hours. Total: ${task.actual_hours.toFixed(2)} hours.`
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to pause task', error.message);
        }
    }
    async completeTask(taskId: string, userId: string): Promise<{ status: boolean, message: string, finalTime: number }> {
        try {
            const task = await this.taskModel.findOne({ _id: new Types.ObjectId(taskId) });
            if (!task) throw new NotFoundException('Task not found');

            // Enforce rating requirement before completion
            if (task.requiresRating && (task.rating === undefined || task.rating === null)) {
                throw new BadRequestException('You must provide a rating before completing this task.');
            }

            const lastLog = task.timeLogs?.[task.timeLogs.length - 1];
            if (lastLog && !lastLog.end) {
                await this.pauseTask(taskId, userId);
            }

            task.status = TASK_STATUS.DONE;

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

    async addActualHours(taskId: string, hours: number, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            const task = await this.taskModel.findById(taskId).exec();
            if (!task) {
                throw new NotFoundException('Task not found');
            }

            if (task.emp?.toString() !== userId && task.assignee?.toString() !== userId) {
                throw new ForbiddenException('You are not authorized to add hours to this task');
            }

            if (hours <= 0) {
                throw new BadRequestException('Hours must be greater than 0');
            }

            if (task.status === TASK_STATUS.DONE) {
                throw new BadRequestException('Cannot add hours to a completed task');
            }

            task.actual_hours = (task.actual_hours || 0) + hours;
            task.hasLoggedHours = true;
            task.totalTimeSpent = (task.totalTimeSpent || 0) + (hours * 3600);

            await task.save();

            return {
                status: true,
                message: `Successfully added ${hours} hours to task. Total actual hours: ${task.actual_hours}`
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
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

            if (task.emp?.toString() !== userId && task.assignee?.toString() !== userId) {
                throw new ForbiddenException('You are not authorized to remove hours from this task');
            }

            if (task.status === TASK_STATUS.DONE) {
                throw new BadRequestException('Cannot remove hours from a completed task');
            }

            const previousHours = task.actual_hours || 0;
            task.actual_hours = 0;
            task.hasLoggedHours = false;
            task.totalTimeSpent = 0;

            await task.save();

            return {
                status: true,
                message: `Successfully removed ${previousHours} hours from task. Task now has no logged hours.`
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to remove actual hours', error.message);
        }
    }

    async rateTask(taskId: string, rating: number, comment: string, status: TASK_STATUS, userId: string): Promise<{ status: boolean, message: string }> {
        const task = await this.taskModel.findById(taskId).exec();
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        if (task.assignee?.toString() !== userId) {
            throw new ForbiddenException('You are not authorized to rate this task');
        }
        if (
            (typeof rating !== 'number' || rating < 1 || rating > 5) &&
            status === TASK_STATUS.DONE
        ) {
            throw new BadRequestException(
                'Rating must be a number between 1 and 5',
            );
        }
        task.comment = comment;
        task.status = status;
        if (status === TASK_STATUS.DONE) task.rating = rating;
        await task.save();
        return { status: true, message: 'Task rated successfully' };
    }
}