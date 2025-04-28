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
    TimeTracking,
    DailyTask,
    ProjectStats,
    MyTask,
    RecentActivity,
    MessagePreview
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

    async getDashboardData(userId: string, params: DashboardParamsDto): Promise<DashboardData> {
        const [
            taskSummary,
            timeTracking,
            dailyTasks,
            projectStats,
            myTasks,
            recentActivities,
            messages
        ] = await Promise.all([
            this.getTaskSummary(userId, params),
            this.getTimeTracking(userId, params),
            this.getDailyTasks(userId),
            this.getProjectStats(userId, params),
            this.getMyTasks(userId),
            this.getRecentActivities(userId),
            this.getMessages(userId)
        ]);

        return {
            taskSummary,
            timeTracking,
            dailyTasks,
            projectStats,
            myTasks,
            recentActivities,
            messages
        };
    }

    private async getTaskSummary(userId: string, params: DashboardParamsDto): Promise<TaskSummary> {
        const matchQuery: Record<string, any> = {
            assignee: new Types.ObjectId(userId)
        };

        if (params.departmentId) {
            matchQuery.department_id = new Types.ObjectId(params.departmentId);
        }

        if (params.projectId) {
            matchQuery.project_id = new Types.ObjectId(params.projectId);
        }

        // Handle undefined timeRange by using a default
        const timeRange = params.timeRange || TimeRange.WEEKLY;
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

        // Get total hours tracked today
        const todayTasks = await this.taskModel.find({
            assignee: new Types.ObjectId(userId),
            "timeLogs.start": { $gte: today },
        }).exec();

        let totalHoursToday = 0;
        todayTasks.forEach(task => {
            if (task.timeLogs && Array.isArray(task.timeLogs)) {
                task.timeLogs.forEach(log => {
                    if (log.start && new Date(log.start) >= today) {
                        const end = log.end ? new Date(log.end) : new Date();
                        const hours = (end.getTime() - new Date(log.start).getTime()) / (1000 * 60 * 60);
                        totalHoursToday += hours;
                    }
                });
            }
        });

        // Get hours by day for the past week
        const timeRange = params.timeRange || TimeRange.WEEKLY;
        const dates = this.getDateRange(timeRange);
        const hoursByDay = await Promise.all(dates.map(async date => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayTasks = await this.taskModel.find({
                assignee: new Types.ObjectId(userId),
                "timeLogs.start": {
                    $gte: date,
                    $lt: nextDay
                }
            }).exec();

            let actualHours = 0;
            dayTasks.forEach(task => {
                if (task.timeLogs && Array.isArray(task.timeLogs)) {
                    task.timeLogs.forEach(log => {
                        if (log.start) {
                            const logStart = new Date(log.start);
                            if (logStart >= date && logStart < nextDay) {
                                const end = log.end ? new Date(log.end) : new Date();
                                const hours = (end.getTime() - logStart.getTime()) / (1000 * 60 * 60);
                                actualHours += hours;
                            }
                        }
                    });
                }
            });

            // This is a placeholder for planned hours
            const plannedHours = 8; // Default 8 hours per day

            return {
                date: date.toISOString().split('T')[0],
                plannedHours,
                actualHours
            };
        }));

        return {
            totalHoursToday,
            hoursByDay
        };
    }

    private async getDailyTasks(userId: string): Promise<DailyTask[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tasks = await this.taskModel.find({
            assignee: new Types.ObjectId(userId),
            due_date: { $gte: today, $lt: tomorrow }
        }).exec();

        return tasks.map(task => ({
            id: task._id.toString(),
            name: task.name,
            dueTime: new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            priority: task.priority,
            status: task.status
        }));
    }

    private async getProjectStats(userId: string, params: DashboardParamsDto): Promise<ProjectStats[]> {
        const matchQuery: Record<string, any> = {};

        if (params.departmentId) {
            matchQuery.departments = new Types.ObjectId(params.departmentId);
        }

        // Find projects the user is involved in
        const projects = await this.projectModel.find(matchQuery).exec();

        return await Promise.all(projects.map(async project => {
            const projectId = project._id;

            // Count total tasks in this project
            const totalTasks = await this.taskModel.countDocuments({
                project_id: projectId
            });

            // Count completed tasks in this project
            const completedTasks = await this.taskModel.countDocuments({
                project_id: projectId,
                status: TASK_STATUS.DONE
            });

            // Calculate progress percentage
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            return {
                id: projectId!.toString(),
                name: project.name,
                progress: Math.round(progress),
                tasksCount: totalTasks
            };
        }));
    }

    private async getMyTasks(userId: string): Promise<MyTask[]> {
        const tasks = await this.taskModel.find({
            assignee: new Types.ObjectId(userId)
        })
            .sort({ due_date: 1 })
            .limit(5)
            .populate('project_id', 'name')
            .exec();

        return await Promise.all(tasks.map(async task => {
            const taskId = task._id;

            // Get subtasks to calculate progress
            const subtasks = await this.taskModel.find({
                parent_task: taskId
            }).exec();

            const totalSubtasks = subtasks.length || 1; // If no subtasks, count the task itself
            const completedSubtasks = subtasks.filter(t => t.status === TASK_STATUS.DONE).length;

            // If no subtasks, use task status for progress
            const progress = task.status === TASK_STATUS.DONE ?
                100 : (subtasks.length ? (completedSubtasks / totalSubtasks) * 100 :
                    task.status === TASK_STATUS.ONGOING ? 50 : 0);

            return {
                id: taskId.toString(),
                name: task.name,
                project: task.project_id ? (task.project_id as any).name : 'No Project',
                status: task.status,
                dueDate: new Date(task.due_date).toLocaleDateString(),
                timeSpent: task.totalTimeSpent || 0,
                progress: Math.round(progress)
            };
        }));
    }

    private async getRecentActivities(userId: string): Promise<RecentActivity[]> {
        // Get tasks associated with the user
        const userTasks = await this.taskModel.find({
            assignee: new Types.ObjectId(userId)
        }).distinct('_id');

        // Get recent comments on these tasks
        const recentComments = await this.commentModel.find({
            task: { $in: userTasks }
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('emp', 'name')
            .populate('task', 'name')
            .exec();

        // Get recent task status changes (based on updatedAt field)
        const recentTaskChanges = await this.taskModel.find({
            _id: { $in: userTasks }
        })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('assignee', 'name')
            .exec();

        // Combine and sort activities
        const commentActivities = recentComments.map(comment => {
            const commentId = comment._id;
            const commentEmp = comment.emp as unknown as { _id: Types.ObjectId; name: string };
            const commentTask = comment.task as unknown as { _id: Types.ObjectId; name: string };

            return {
                id: commentId!.toString(),
                type: 'comment' as const,
                user: {
                    id: commentEmp._id.toString(),
                    name: commentEmp.name,
                },
                content: comment.content,
                taskId: commentTask._id.toString(),
                taskName: commentTask.name,
                timestamp: comment.createdAt || new Date()
            };
        });

        const taskActivities = recentTaskChanges.map(task => {
            const taskId = task._id;
            const taskAssignee = task.assignee as unknown as { _id: Types.ObjectId; name: string } | undefined;

            return {
                id: taskId.toString() + '-status',
                type: 'status_change' as const,
                user: {
                    id: taskAssignee?._id?.toString() || userId,
                    name: taskAssignee?.name || 'Unknown User',
                },
                content: `Task status changed to ${task.status}`,
                taskId: taskId.toString(),
                taskName: task.name,
                timestamp: task.updatedAt || new Date()
            };
        });

        const activities = [...commentActivities, ...taskActivities];

        // Sort by date and limit to 5
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