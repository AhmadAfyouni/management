import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { Task, TaskDocument } from '../task/schema/task.schema';
import { Project, ProjectDocument } from '../project/schema/project.schema';
import { Emp, EmpDocument } from '../emp/schemas/emp.schema';
import { Department, DepartmentDocument } from '../department/schema/department.schema';
import { Comment, CommentDocument } from '../comment/schema/comment.schema';
import { TASK_STATUS } from '../task/enums/task-status.enum';
import { PRIORITY_TYPE } from '../task/enums/priority.enum';
import { DashboardParamsDto, TimeRange } from './dto/dashboard-params.dto';
import {
    DashboardData,
    TaskSummary,
    DailyTask,
    ProjectStats,
    MyTask,
    TimeTracking,
    RecentActivity,
    MessagePreview,
    DailyTimelineResponse,
    TimelineEntry
} from './interfaces/dashboard.interface';

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>
    ) { }

    async getDashboardData(userId: string, departmentId: string, params: DashboardParamsDto): Promise<DashboardData> {
        const targetDate = params.date ? new Date(params.date) : undefined;
        const [
            taskSummary,
            dailyTimeline,
            timeTracking,
            dailyTasks,
            projectStats,
            myTasks,
            recentActivities,
            messages
        ] = await Promise.all([
            this.getTaskSummary(userId, params),
            this.getDailyTimeline(userId, targetDate),
            this.getTimeTracking(userId, params),
            this.getDailyTasks(userId),
            this.getProjectStats(userId, departmentId, params),
            this.getMyTasks(userId),
            this.getRecentActivities(userId),
            this.getMessages(userId)
        ]);

        return {
            taskSummary,
            dailyTimeline,
            timeTracking,
            dailyTasks,
            projectStats,
            myTasks,
            recentActivities,
            messages
        };
    }


    async getDailyTimeline(userId: string, date?: Date): Promise<DailyTimelineResponse> {
        // Use today if no date specified
        const targetDate = date || new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get user settings for shift times
        const userSettings = await this.getUserSettings(userId);
        const { shiftStart, shiftEnd } = userSettings;

        // Get all tasks with time logs for the specified date
        const tasksWithTimeLogs = await this.taskModel.find({
            emp: userId,
            "timeLogs.start": {
                $gte: targetDate,
                $lt: nextDay
            }
        })
            .populate('project_id', 'name')
            .exec();

        console.log(tasksWithTimeLogs);

        // Process time logs into timeline entries
        const timelineEntries: TimelineEntry[] = [];
        let totalWorkingTime = 0;

        tasksWithTimeLogs.forEach(task => {
            if (task.timeLogs && task.timeLogs.length > 0) {
                task.timeLogs.forEach(log => {
                    if (log.start && log.end) {
                        const startDate = new Date(log.start);
                        const endDate = new Date(log.end);

                        // Check if the time log is within the target date and shift
                        if (startDate >= targetDate && startDate < nextDay && log.end) {
                            const project = task.project_id as any;
                            const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

                            // Calculate position and width for timeline display
                            const { position, width } = this.calculateTimelinePosition(
                                startDate,
                                endDate,
                                shiftStart,
                                shiftEnd
                            );

                            timelineEntries.push({
                                taskId: task._id.toString(),
                                taskName: task.name,
                                projectId: project?._id.toString() || '',
                                projectName: project?.name || 'No Project',
                                startTime: startDate.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                }),
                                endTime: endDate.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                }),
                                duration: Math.round(duration * 10) / 10,
                                position,
                                width
                            });

                            totalWorkingTime += duration;
                        }
                    }
                });
            }
        });

        // Sort entries by start time
        timelineEntries.sort((a, b) => {
            const timeA = new Date(`1970-01-01T${a.startTime}`).getTime();
            const timeB = new Date(`1970-01-01T${b.startTime}`).getTime();
            return timeA - timeB;
        });

        // Calculate total break time
        const totalBreakTime = this.calculateBreakTimeFromEntries(timelineEntries);

        return {
            entries: timelineEntries,
            totalWorkingTime: Math.round(totalWorkingTime * 10) / 10,
            totalBreakTime: Math.round(totalBreakTime * 10) / 10,
            shiftStart,
            shiftEnd
        };
    }

    private calculateTimelinePosition(
        startTime: Date,
        endTime: Date,
        shiftStart: string,
        shiftEnd: string
    ): { position: number; width: number } {
        // Parse shift times
        const [startHour, startMinute] = shiftStart.split(':').map(Number);
        const [endHour, endMinute] = shiftEnd.split(':').map(Number);

        // Calculate shift duration in minutes
        const shiftStartMinutes = startHour * 60 + startMinute;
        const shiftEndMinutes = endHour * 60 + endMinute;
        const shiftDurationMinutes = shiftEndMinutes - shiftStartMinutes;

        // Calculate task start and end in minutes from shift start
        const taskStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const taskEndMinutes = endTime.getHours() * 60 + endTime.getMinutes();

        // Calculate position and width as percentages
        const position = ((taskStartMinutes - shiftStartMinutes) / shiftDurationMinutes) * 100;
        const width = ((taskEndMinutes - taskStartMinutes) / shiftDurationMinutes) * 100;

        return {
            position: Math.max(0, Math.min(100, position)),
            width: Math.max(0, Math.min(100, width))
        };
    }
    private calculateBreakTimeFromEntries(entries: TimelineEntry[]): number {
        if (entries.length <= 1) return 0;

        let totalBreakTime = 0;

        for (let i = 0; i < entries.length - 1; i++) {
            const currentEndTime = entries[i].endTime;
            const nextStartTime = entries[i + 1].startTime;

            const currentEnd = new Date(`1970-01-01T${currentEndTime}`);
            const nextStart = new Date(`1970-01-01T${nextStartTime}`);

            const breakDuration = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60);

            if (breakDuration > 0) {
                totalBreakTime += breakDuration;
            }
        }

        return totalBreakTime;
    }


    private async getTaskSummary(userId: string, params: DashboardParamsDto): Promise<TaskSummary> {
        const matchQuery: Record<string, any> = {
            emp: userId
        };

        if (params.departmentId) {
            matchQuery.department_id = new Types.ObjectId(params.departmentId);
        }

        if (params.projectId) {
            matchQuery.project_id = new Types.ObjectId(params.projectId);
        }

        // Handle undefined timeRange by using a default
        const timeRange = params.timeRange || TimeRange.MONTHLY;
        const dateRange = this.getDateRangeFilter(timeRange);
        if (dateRange) {
            matchQuery.createdAt = dateRange;
        }


        const taskStats = await this.taskModel.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]).exec();

        // Initialize with zeroes
        const summary: TaskSummary = {
            total: 0,
            inProgress: 0,
            completed: 0,
            pending: 0
        };

        // Fill with actual values
        taskStats.forEach(stat => {
            switch (stat._id) {
                case TASK_STATUS.ONGOING:
                    summary.inProgress = stat.count;
                    break;
                case TASK_STATUS.DONE:
                    summary.completed = stat.count;
                    break;
                case TASK_STATUS.PENDING:
                    summary.pending = stat.count;
                    break;
                // Handle ON_TEST if needed or add it to one of the above categories
            }
        });

        summary.total = summary.inProgress + summary.completed + summary.pending;

        return summary;
    }

    private async getTimeTracking(userId: string, params: DashboardParamsDto): Promise<TimeTracking> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get user settings for shift information and overtime rate
        const userSettings = await this.getUserSettings(userId);
        const { shiftStart, shiftEnd, dailyWorkHours, overtimeRate } = userSettings;

        // Get total hours tracked today
        const todayTasks = await this.taskModel.find({
            emp: userId,
            "timeLogs.start": { $gte: today },
        }).exec();

        let totalHoursToday = 0;
        let breakTime = 0;
        const allTimeLogs: Array<{ start: Date; end: Date }> = [];

        // Collect all time logs from today's tasks
        todayTasks.forEach(task => {
            if (task.timeLogs && Array.isArray(task.timeLogs)) {
                task.timeLogs.forEach(log => {
                    if (log.start && log.end && new Date(log.start) >= today) {
                        const startTime = new Date(log.start);
                        const endTime = new Date(log.end);

                        if (this.isWithinShift(startTime, endTime, shiftStart, shiftEnd)) {
                            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                            totalHoursToday += hours;
                            allTimeLogs.push({ start: startTime, end: endTime });
                        }
                    }
                });
            }
        });

        // Calculate break time (time between task timers)
        breakTime = this.calculateBreakTime(allTimeLogs, shiftStart, shiftEnd);

        // Calculate overtime
        const overtimeHours = totalHoursToday > dailyWorkHours ?
            totalHoursToday - dailyWorkHours : 0;

        // Calculate total time including breaks
        const totalTime = totalHoursToday + breakTime;

        // Format total time as HH:MM:SS
        const totalTimeFormatted = this.formatTimeToHHMMSS(totalTime);

        // Get hours by day for the past week
        const timeRange = params.timeRange || TimeRange.WEEKLY;
        const dates = this.getDateRange(timeRange);
        const hoursByDay = await Promise.all(dates.map(async date => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayTasks = await this.taskModel.find({
                emp: userId,
                "timeLogs.start": {
                    $gte: date,
                    $lt: nextDay
                }
            }).exec();

            let actualHours = 0;
            dayTasks.forEach(task => {
                if (task.timeLogs && Array.isArray(task.timeLogs)) {
                    task.timeLogs.forEach(log => {
                        if (log.start && log.end) {
                            const logStart = new Date(log.start);
                            const logEnd = new Date(log.end);

                            if (logStart >= date && logStart < nextDay) {
                                // Check if within shift hours
                                if (this.isWithinShift(logStart, logEnd, shiftStart, shiftEnd)) {
                                    const hours = (logEnd.getTime() - logStart.getTime()) / (1000 * 60 * 60);
                                    actualHours += hours;
                                }
                            }
                        }
                    });
                }
            });

            // Get planned hours from user settings
            const plannedHours = dailyWorkHours;

            return {
                date: date.toISOString().split('T')[0],
                plannedHours,
                actualHours: Number(actualHours.toFixed(2))
            };
        }));

        return {
            totalTimeToday: totalTimeFormatted,
            workedHours: Number(totalHoursToday.toFixed(2)),
            breakTime: Number(breakTime.toFixed(2)),
            overtimeHours: Number(overtimeHours.toFixed(2)),
            overtimeRate,
            hoursByDay
        };
    }

    // Helper method to format time to HH:MM:SS
    private formatTimeToHHMMSS(totalHours: number): string {
        const hours = Math.floor(totalHours);
        const minutes = Math.floor((totalHours % 1) * 60);
        const seconds = Math.floor(((totalHours % 1) * 60 % 1) * 60);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }


    private isWithinShift(start: Date, end: Date, shiftStart: string, shiftEnd: string): boolean {
        const startHours = parseInt(shiftStart.split(':')[0]);
        const startMinutes = parseInt(shiftStart.split(':')[1]);
        const endHours = parseInt(shiftEnd.split(':')[0]);
        const endMinutes = parseInt(shiftEnd.split(':')[1]);

        const sessionStartHours = start.getHours();
        const sessionStartMinutes = start.getMinutes();
        const sessionEndHours = end.getHours();
        const sessionEndMinutes = end.getMinutes();

        const shiftStartMinutes = startHours * 60 + startMinutes;
        const shiftEndMinutes = endHours * 60 + endMinutes;
        const sessionStartTotalMinutes = sessionStartHours * 60 + sessionStartMinutes;
        const sessionEndTotalMinutes = sessionEndHours * 60 + sessionEndMinutes;

        return sessionStartTotalMinutes >= shiftStartMinutes && sessionEndTotalMinutes <= shiftEndMinutes;
    }

    private calculateBreakTime(timeLogs: Array<{ start: Date; end: Date }>, shiftStart: string, shiftEnd: string): number {
        if (timeLogs.length <= 1) return 0;

        // Sort time logs by start time
        const sortedLogs = timeLogs.sort((a, b) => a.start.getTime() - b.start.getTime());

        let totalBreakTime = 0;

        for (let i = 0; i < sortedLogs.length - 1; i++) {
            const currentEnd = sortedLogs[i].end;
            const nextStart = sortedLogs[i + 1].start;

            // Calculate gap between tasks
            const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

            // Only count as break if within shift hours
            if (this.isWithinShift(currentEnd, nextStart, shiftStart, shiftEnd)) {
                totalBreakTime += gapMinutes;
            }
        }

        return totalBreakTime / 60; // Convert to hours
    }

    private async getUserSettings(userId: string): Promise<{
        shiftStart: string;
        shiftEnd: string;
        dailyWorkHours: number;
        overtimeRate: number;
    }> {
        const user = await this.empModel.findById(userId).exec();

        return {
            shiftStart: '09:00',
            shiftEnd: '17:00',
            dailyWorkHours: 8,
            overtimeRate: 1.25 // 25% overtime rate
        };
    }


    private async getDailyTasks(userId: string): Promise<DailyTask[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        today.setDate(today.getDate() - 1);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tasks = await this.taskModel.find({
            emp: userId,
            due_date: { $gte: today },
            status: { $ne: TASK_STATUS.DONE }
        }).exec();

        return tasks.map(task => ({
            id: task._id.toString(),
            name: task.name,
            dueTime: new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            priority: task.priority,
            status: task.status,
            timeLogs: task.timeLogs
        }));
    }

    private async getProjectStats(userId: string, departmentId: string, params: DashboardParamsDto): Promise<ProjectStats[]> {
        const matchQuery: Record<string, any> = {};


        const projectQuery: Record<string, any> = {
            departments: { $in: [departmentId] }
        };


        const dateRange = this.getDateRangeFilter(params.timeRange!);
        if (dateRange) {
            if (dateRange) {
                projectQuery.$or = [
                    { startDate: { $lte: dateRange.$lte } },
                    { endDate: { $gte: dateRange.$gte } }
                ];
            }
        }


        const projects = await this.projectModel.find(projectQuery).exec();

        return await Promise.all(projects.map(async project => {
            const projectId = project._id;

            // Get tasks assigned to this user for this project
            const userProjectTasks = await this.taskModel.find({
                project_id: projectId,
                emp: userId
            }).exec();

            // Count total tasks in this project (for all users)
            const totalTasks = await this.taskModel.countDocuments({
                project_id: projectId
            });

            // Count completed tasks in this project (for all users)
            const completedTasks = await this.taskModel.countDocuments({
                project_id: projectId,
                status: TASK_STATUS.DONE
            });

            // Calculate progress percentage
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            // Calculate total hours spent by user on this project
            let hoursSpent = 0;
            userProjectTasks.forEach(task => {
                if (task.timeLogs && task.timeLogs.length > 0) {
                    hoursSpent += this.calculateTotalTimeSpent(task.timeLogs);
                }
            });

            // Convert milliseconds to hours
            hoursSpent = hoursSpent / (1000 * 60 * 60);

            return {
                id: projectId!.toString(),
                name: project.name,
                progress: Math.round(progress),
                tasksCount: totalTasks,
                hoursSpent: Math.round(hoursSpent * 10) / 10, // Round to 1 decimal place
            };
        }));
    }


    private calculateTotalTimeSpent(timeLogs: { start: Date; end?: Date }[]): number {
        if (!timeLogs || timeLogs.length === 0) {
            return 0;
        }

        return timeLogs.reduce((total, log) => {
            if (log.start) {
                const endTime = log.end ? new Date(log.end) : new Date();
                const timeSpent = endTime.getTime() - new Date(log.start).getTime();
                return total + timeSpent;
            }
            return total;
        }, 0);
    }

    private async getMyTasks(userId: string): Promise<MyTask[]> {
        const tasks = await this.taskModel.find({
            emp: userId
        })
            .sort({ due_date: 1 })
            .limit(5)
            .populate('project_id', 'name')
            .exec();

        return await Promise.all(tasks.map(async task => {
            const taskId = task._id;

            const calculateTotalTimeSpent = (timeLogs: { start: Date; end?: Date }[]): number => {
                return timeLogs.reduce((total, log) => {
                    if (log.start) {
                        const endTime = log.end ? new Date(log.end) : new Date();
                        const timeSpent = endTime.getTime() - new Date(log.start).getTime();
                        return total + timeSpent;
                    }
                    return total;
                }, 0);
            };
            const calculateExpectedTime = (createdAt: Date, dueDate: Date): number => {
                const created = new Date(createdAt);
                const due = new Date(dueDate);
                return due.getTime() - created.getTime();
            };
            const totalTimeSpent = calculateTotalTimeSpent(task.timeLogs);
            const expectedTime = calculateExpectedTime(task.createdAt as any, task.due_date);

            const comments = await this.commentModel.find({
                task: taskId.toString()
            }).lean().exec();


            const progress = task.status === TASK_STATUS.DONE
                ? 100
                : expectedTime > 0
                    ? Math.min((totalTimeSpent / expectedTime) * 100, 100)
                    : 0;

            return {
                id: taskId.toString(),
                name: task.name,
                project: task.project_id ? (task.project_id as any).name : 'No Project',
                status: task.status,
                dueDate: new Date(task.due_date).toLocaleDateString(),
                timeSpent: task.totalTimeSpent || 0,
                progress: Math.round(progress),
                commentsCount: comments.length,
                filesCount: task.files.length
            };
        }));
    }

    private async getRecentActivities(userId: string): Promise<RecentActivity[]> {

        const myTasks = await this.taskModel.find({
            emp: userId
        }).distinct('_id');

        const myComments = await this.commentModel.find({
            emp: userId,
            task: { $in: myTasks }
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('task', 'name')
            .exec();

        const myTaskChanges = await this.taskModel.find({
            emp: userId,
            updatedAt: { $exists: true }
        })
            .sort({ updatedAt: -1 })
            .limit(10)
            .exec();

        const myTaskActions = await this.taskModel.aggregate([
            { $match: { emp: userId } },
            { $unwind: { path: "$timeLogs", preserveNullAndEmptyArrays: true } },
            { $sort: { "timeLogs.start": -1 } },
            { $limit: 5 }
        ]).exec();

        const commentActivities = myComments.map(comment => {
            const commentId = comment._id as any;
            const commentTask = comment.task as unknown as { _id: Types.ObjectId; name: string };

            return {
                id: commentId.toString(),
                type: 'comment' as const,
                user: {
                    id: userId,
                    name: 'You',
                },
                content: comment.content,
                taskId: commentTask._id.toString(),
                taskName: commentTask.name,
                timestamp: comment.createdAt || new Date()
            };
        });

        const statusChangeActivities = myTaskChanges
            .filter(task => task.updatedAt > task.createdAt) // Only if the task was actually updated
            .map(task => {
                const taskId = task._id;

                return {
                    id: taskId.toString() + '-status',
                    type: 'status_change' as const,
                    user: {
                        id: userId,
                        name: 'You',
                    },
                    content: `Changed task status to ${task.status}`,
                    taskId: taskId.toString(),
                    taskName: task.name,
                    timestamp: task.updatedAt || new Date()
                };
            });

        // Map timer actions to activities
        const timerActivities = myTaskActions
            .filter(item => item.timeLogs && item.timeLogs.start)
            .map(item => {
                const task = item;
                const timeLog = item.timeLogs;

                return {
                    id: `${task._id}-${timeLog.start.getTime()}`,
                    type: 'timer_action' as const,
                    user: {
                        id: userId,
                        name: 'Me',
                    },
                    content: timeLog.end
                        ? `Stopped timer for task`
                        : `Started working on task`,
                    taskId: task._id.toString(),
                    taskName: task.name,
                    timestamp: timeLog.start
                };
            });

        // Combine all personal activities
        const activities = [
            ...commentActivities,
            ...statusChangeActivities,
            ...timerActivities
        ];

        // Sort by date and limit to 5 most recent
        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }


    private async getMessages(userId: string): Promise<MessagePreview[]> {
        // This would need to be connected to your messaging system
        // For now, returning a placeholder implementation
        return [];
    }

    private getDateRangeFilter(timeRange: TimeRange): { $gte: Date; $lte: Date } | null {
        const now = new Date();
        const startDate = new Date();

        switch (timeRange) {
            case TimeRange.DAILY:
                startDate.setHours(0, 0, 0, 0);
                return { $gte: startDate, $lte: now };

            case TimeRange.WEEKLY:
                startDate.setDate(now.getDate() - 7);
                return { $gte: startDate, $lte: now };

            case TimeRange.MONTHLY:
                startDate.setMonth(now.getMonth() - 1);
                return { $gte: startDate, $lte: now };

            default:
                return null;
        }
    }

    private getDateRange(timeRange: TimeRange): Date[] {
        const dates: Date[] = [];
        const now = new Date();
        let numDays: number;

        switch (timeRange) {
            case TimeRange.DAILY:
                numDays = 1;
                break;
            case TimeRange.WEEKLY:
                numDays = 7;
                break;
            case TimeRange.MONTHLY:
                numDays = 30;
                break;
            default:
                numDays = 7;
        }

        for (let i = numDays - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            dates.push(date);
        }

        return dates;
    }
}