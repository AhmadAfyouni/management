import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { Task, TaskDocument } from '../task/schema/task.schema';
import { Project, ProjectDocument } from '../project/schema/project.schema';
import { Emp, EmpDocument } from '../emp/schemas/emp.schema';
import { Department, DepartmentDocument } from '../department/schema/department.schema';
import { Comment, CommentDocument } from '../comment/schema/comment.schema';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { ProgressCalculationMethod, WorkDay } from '../company-settings/schemas/company-settings.schema';
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
import { RoutineTask, RoutineTaskDocument } from '../job-titles/schema/job-ttiles.schema';
import { ProjectStatus } from '../project/enums/project-status';

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
        @InjectModel(RoutineTask.name) private routineTaskModel: Model<RoutineTaskDocument>,
        private readonly companySettingsService: CompanySettingsService
    ) { }

    async getDashboardData(userId: string, departmentId: string, params: DashboardParamsDto): Promise<DashboardData> {
        const targetDate = params.date ? new Date(params.date) : undefined;

        const companySettings = await this.companySettingsService.getOrCreateSettings();

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
            this.getEnhancedTaskSummary(userId, departmentId, params, companySettings),
            this.getEnhancedDailyTimeline(userId, companySettings, targetDate),
            this.getEnhancedTimeTracking(userId, params, companySettings),
            this.getEnhancedDailyTasks(userId, companySettings),
            this.getEnhancedProjectStats(userId, departmentId, params, companySettings),
            this.getEnhancedMyTasks(userId, companySettings),
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
        const companySettings = await this.companySettingsService.getOrCreateSettings();
        return this.getEnhancedDailyTimeline(userId, companySettings, date);
    }

    private async getEnhancedTaskSummary(userId: string, departmentId: string, params: DashboardParamsDto, companySettings: any): Promise<TaskSummary> {
        const matchQuery: Record<string, any> = {
            emp: userId
        };

        if (params.departmentId) {
            matchQuery.department_id = new Types.ObjectId(params.departmentId);
        }

        if (params.projectId) {
            matchQuery.project_id = new Types.ObjectId(params.projectId);
        }

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

        const summary: TaskSummary = {
            total: 0,
            inProgress: 0,
            completed: 0,
            pending: 0,
            routineTasks: 0,
            projectTasks: 0,
            overdueCount: 0,
            completionRate: 0
        };

        // Get routine tasks count
        const routineTasksCount = await this.taskModel.countDocuments({
            emp: userId,
            isRoutineTask: true,
            ...matchQuery
        });

        // Get project tasks count
        const projectTasksCount = await this.taskModel.countDocuments({
            emp: userId,
            project_id: { $ne: null },
            ...matchQuery
        });

        // Get overdue tasks count
        const overdueCount = await this.taskModel.countDocuments({
            emp: userId,
            due_date: { $lt: new Date() },
            status: { $ne: TASK_STATUS.DONE },
            ...matchQuery
        });

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
            }
        });

        summary.total = summary.inProgress + summary.completed + summary.pending;
        summary.routineTasks = routineTasksCount;
        summary.projectTasks = projectTasksCount;
        summary.overdueCount = overdueCount;
        summary.completionRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

        return summary;
    }

    private async getEnhancedTimeTracking(userId: string, params: DashboardParamsDto, companySettings: any): Promise<TimeTracking> {
        // Remove today filter, calculate total worked hours for all time
        const allUserTasks = await this.taskModel.find({ emp: userId }).exec();

        let totalWorkedHours = 0;
        allUserTasks.forEach(task => {
            if (task.timeLogs && Array.isArray(task.timeLogs)) {
                task.timeLogs.forEach(log => {
                    if (log.start && log.end) {
                        const startTime = new Date(log.start);
                        const endTime = new Date(log.end);
                        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                        totalWorkedHours += hours;
                    }
                });
            }
        });

        // The rest of the fields can remain as before, but workedHours is now total
        // You may want to adjust breakTime, overtimeHours, etc. if you want them to be total as well
        // For now, keep them as today (or recalculate as needed)

        const { workSettings } = companySettings;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayWorkingHours = this.getDayWorkingHours(today, companySettings);
        const dailyWorkHours = this.calculateDailyWorkingHours(todayWorkingHours);
        const overtimeRate = workSettings.overtimeRate || 1.5;

        // Keep breakTime, overtimeHours, etc. as today for now
        let totalHoursToday = 0;
        const allTimeLogs: Array<{ start: Date; end: Date }> = [];
        const todayTasks = await this.taskModel.find({
            emp: userId,
            "timeLogs.start": { $gte: today },
        }).exec();
        todayTasks.forEach(task => {
            if (task.timeLogs && Array.isArray(task.timeLogs)) {
                task.timeLogs.forEach(log => {
                    if (log.start && log.end && new Date(log.start) >= today) {
                        const startTime = new Date(log.start);
                        const endTime = new Date(log.end);
                        if (this.isWithinShift(startTime, endTime, companySettings)) {
                            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                            totalHoursToday += hours;
                            allTimeLogs.push({ start: startTime, end: endTime });
                        }
                    }
                });
            }
        });
        const breakTime = this.calculateBreakTime(allTimeLogs, companySettings);
        const overtimeHours = totalHoursToday > dailyWorkHours ? totalHoursToday - dailyWorkHours : 0;
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
                                if (this.isWithinShift(logStart, logEnd, companySettings)) {
                                    const hours = (logEnd.getTime() - logStart.getTime()) / (1000 * 60 * 60);
                                    actualHours += hours;
                                }
                            }
                        }
                    });
                }
            });
            const dayWorkingHours = this.getDayWorkingHours(date, companySettings);
            const plannedHours = this.calculateDailyWorkingHours(dayWorkingHours);
            return {
                date: date.toISOString().split('T')[0],
                plannedHours,
                actualHours: Number(actualHours.toFixed(2))
            };
        }));
        // Efficiency and productivityScore can remain as before
        const efficiency = dailyWorkHours > 0 ? Math.round((totalHoursToday / dailyWorkHours) * 100) : 0;
        return {
            workedHours: Number(totalWorkedHours.toFixed(2)), // now total
            breakTime: Number(breakTime.toFixed(2)),
            overtimeHours: Number(overtimeHours.toFixed(2)),
            overtimeRate,
            hoursByDay,
            efficiency,
            expectedHours: dailyWorkHours,
            workingDaysThisWeek: await this.getWorkingDaysCount(params.timeRange || TimeRange.WEEKLY, companySettings),
            productivityScore: this.calculateProductivityScore(totalHoursToday, dailyWorkHours, efficiency)
        };
    }

    private async getEnhancedDailyTasks(userId: string, companySettings: any): Promise<DailyTask[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
            timeLogs: task.timeLogs,
            isRoutineTask: task.isRoutineTask || false,
            isOverdue: task.due_date < new Date() && task.status !== TASK_STATUS.DONE,
            progress: this.calculateTaskProgress(task, companySettings),
            estimatedHours: task.estimated_hours || 0,
            actualHours: task.actual_hours || 0
        }));
    }

    private async getEnhancedProjectStats(userId: string, departmentId: string, params: DashboardParamsDto, companySettings: any): Promise<ProjectStats[]> {
        const projectQuery: Record<string, any> = {
            departments: { $in: [new Types.ObjectId(departmentId)] }
        };

        const dateRange = this.getDateRangeFilter(params.timeRange!);
        if (dateRange) {
            projectQuery.$or = [
                { startDate: { $lte: dateRange.$lte } },
                { endDate: { $gte: dateRange.$gte } }
            ];
        }

        const projects = await this.projectModel.find(projectQuery).exec();

        return await Promise.all(projects.map(async project => {
            const projectId = project._id;

            const userProjectTasks = await this.taskModel.find({
                project_id: projectId,
                emp: userId
            }).exec();

            const totalTasks = await this.taskModel.countDocuments({
                project_id: projectId
            });

            const completedTasks = await this.taskModel.countDocuments({
                project_id: projectId,
                status: TASK_STATUS.DONE
            });

            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            let hoursSpent = 0;
            userProjectTasks.forEach(task => {
                if (task.timeLogs && task.timeLogs.length > 0) {
                    hoursSpent += this.calculateTotalTimeSpent(task.timeLogs);
                }
            });

            hoursSpent = hoursSpent / (1000 * 60 * 60);

            const projectHealth = this.calculateProjectHealth(project, totalTasks, completedTasks, hoursSpent);
            const isOnTrack = this.isProjectOnTrack(project, progress, companySettings);

            // حساب مجموع الساعات الكلية التي عمل عليها المستخدم في هذا المشروع
            let totalWorkedHours = 0;
            userProjectTasks.forEach(task => {
                if (task.timeLogs && task.timeLogs.length > 0) {
                    totalWorkedHours += this.calculateTotalTimeSpent(task.timeLogs);
                } else if (task.actual_hours) {
                    totalWorkedHours += task.actual_hours * 60 * 60 * 1000; // تحويل ساعات فعلية إلى ms
                }
            });
            totalWorkedHours = totalWorkedHours / (1000 * 60 * 60); // تحويل إلى ساعات

            return {
                id: projectId!.toString(),
                name: project.name,
                progress: Math.round(progress),
                tasksCount: totalTasks,
                hoursSpent: Math.round(hoursSpent * 10) / 10,
                completedTasks,
                pendingTasks: totalTasks - completedTasks,
                health: projectHealth,
                isOnTrack,
                daysRemaining: await this.calculateDaysRemaining(project.endDate, companySettings),
                estimatedCompletionDate: this.estimateProjectCompletion(project, progress, companySettings),
                totalWorkedHours: Math.round(totalWorkedHours * 100) / 100 // عدد الساعات الكلية للمستخدم في هذا المشروع
            };
        }));
    }

    private async getEnhancedMyTasks(userId: string, companySettings: any): Promise<MyTask[]> {
        const tasks = await this.taskModel.find({
            emp: userId
        })
            .sort({ due_date: 1 })
            .limit(5)
            .populate('project_id', 'name')
            .exec();

        return await Promise.all(tasks.map(async task => {
            const taskId = task._id;

            const comments = await this.commentModel.find({
                task: taskId.toString()
            }).lean().exec();

            const calculatedProgress = this.calculateTaskProgress(task, companySettings);
            const priorityScore = this.calculatePriorityScore(task.priority, task.due_date);

            return {
                id: taskId.toString(),
                name: task.name,
                project: task.project_id ? (task.project_id as any).name : 'No Project',
                status: task.status,
                dueDate: new Date(task.due_date).toLocaleDateString(),
                timeSpent: task.totalTimeSpent || 0,
                progress: Math.round(calculatedProgress),
                commentsCount: comments.length,
                filesCount: task.files.length,
                isRoutineTask: task.isRoutineTask || false,
                isOverdue: task.due_date < new Date() && task.status !== TASK_STATUS.DONE,
                priorityScore,
                estimatedHours: task.estimated_hours || 0,
                actualHours: task.actual_hours || 0,
                section: task.section_id ? 'Custom Section' : 'Default'
            };
        }));
    }

    private async getEnhancedDailyTimeline(userId: string, companySettings: any, date?: Date): Promise<DailyTimelineResponse> {
        const targetDate = date ? new Date(date) : new Date();

        // Ensure targetDate is a valid Date object
        if (isNaN(targetDate.getTime())) {
            throw new Error('Invalid date provided for daily timeline');
        }

        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get working hours for the target date
        const dayWorkingHours = this.getDayWorkingHours(targetDate, companySettings);

        const tasksWithTimeLogs = await this.taskModel.find({
            emp: userId,
            "timeLogs.start": {
                $gte: targetDate,
                $lt: nextDay
            }
        })
            .populate('project_id', 'name')
            .exec();

        const timelineEntries: TimelineEntry[] = [];
        let totalWorkingTime = 0;

        tasksWithTimeLogs.forEach(task => {
            if (task.timeLogs && task.timeLogs.length > 0) {
                task.timeLogs.forEach(log => {
                    if (log.start && log.end) {
                        const startDate = new Date(log.start);
                        const endDate = new Date(log.end);

                        if (startDate >= targetDate && startDate < nextDay && log.end) {
                            const project = task.project_id as any;
                            const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

                            const { position, width } = this.calculateTimelinePosition(
                                startDate,
                                endDate,
                                dayWorkingHours.startTime,
                                dayWorkingHours.endTime
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

        timelineEntries.sort((a, b) => {
            const timeA = new Date(`1970-01-01T${a.startTime}`).getTime();
            const timeB = new Date(`1970-01-01T${b.startTime}`).getTime();
            return timeA - timeB;
        });

        const totalBreakTime = this.calculateBreakTimeFromEntries(timelineEntries);

        return {
            entries: timelineEntries,
            totalWorkingTime: Math.round(totalWorkingTime * 10) / 10,
            totalBreakTime: Math.round(totalBreakTime * 10) / 10,
            shiftStart: dayWorkingHours.startTime,
            shiftEnd: dayWorkingHours.endTime
        };
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
            {
                $unwind: {
                    path: "$timeLogs",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: {
                    "timeLogs.start": -1
                }
            },
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
            .filter(task => task.updatedAt > task.createdAt)
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

        const activities = [
            ...commentActivities,
            ...statusChangeActivities,
            ...timerActivities
        ];

        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }

    // New endpoint methods
    async getRoutineTasksOverview(userId: string, departmentId: string): Promise<any> {
        const routineTasks = await this.taskModel.find({
            emp: userId,
            isRoutineTask: true,
            isActive: true
        }).exec();

        const routineStats = {
            totalRoutineTasks: routineTasks.length,
            completedToday: routineTasks.filter(task => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return task.status === TASK_STATUS.DONE &&
                    task.updatedAt &&
                    new Date(task.updatedAt) >= today;
            }).length,
            upcomingRoutine: routineTasks.filter(task =>
                task.status === TASK_STATUS.PENDING &&
                new Date(task.due_date) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
            ).length,
            overdueRoutine: routineTasks.filter(task =>
                task.due_date < new Date() && task.status !== TASK_STATUS.DONE
            ).length
        };

        return {
            status: true,
            message: 'Routine tasks overview retrieved successfully',
            data: {
                stats: routineStats,
                recentTasks: routineTasks.slice(0, 5).map(task => ({
                    id: task._id.toString(),
                    name: task.name,
                    status: task.status,
                    dueDate: task.due_date,
                    routineType: task.routineTaskId || 'Unknown'
                }))
            }
        };
    }

    async getProgressAnalytics(userId: string, departmentId: string, params: DashboardParamsDto): Promise<any> {
        const companySettings = await this.companySettingsService.getOrCreateSettings();
        const timeRange = params.timeRange || TimeRange.WEEKLY;
        const dateRange = this.getDateRangeFilter(timeRange);

        const query: any = { emp: userId };
        if (dateRange) {
            query.createdAt = dateRange;
        }

        const tasks = await this.taskModel.find(query).exec();

        const analytics = {
            totalTasks: tasks.length,
            completedTasks: tasks.filter(task => task.status === TASK_STATUS.DONE).length,
            averageProgress: 0,
            completionRate: 0,
            estimatedVsActual: {
                totalEstimated: 0,
                totalActual: 0,
                variance: 0
            },
            progressTrend: []
        };

        if (tasks.length > 0) {
            const progressValues = tasks.map(task => this.calculateTaskProgress(task, companySettings));
            analytics.averageProgress = Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length);
            analytics.completionRate = Math.round((analytics.completedTasks / analytics.totalTasks) * 100);

            const estimatedTotal = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
            const actualTotal = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);

            analytics.estimatedVsActual = {
                totalEstimated: estimatedTotal,
                totalActual: actualTotal,
                variance: estimatedTotal > 0 ? Math.round(((actualTotal - estimatedTotal) / estimatedTotal) * 100) : 0
            };

            analytics.progressTrend = this.calculateProgressTrend(tasks, timeRange, companySettings) as any;
        }

        return {
            status: true,
            message: 'Progress analytics retrieved successfully',
            data: analytics
        };
    }

    async getWorkloadDistribution(userId: string, departmentId: string, params: DashboardParamsDto): Promise<any> {
        const departmentEmployees = await this.empModel.find({
            department_id: new Types.ObjectId(departmentId),
            isActive: true
        }).exec();

        const workloadData = await Promise.all(
            departmentEmployees.map(async (employee) => {
                const employeeTasks = await this.taskModel.find({
                    emp: employee._id,
                    status: { $ne: TASK_STATUS.DONE }
                }).exec();

                const totalHours = employeeTasks.reduce((sum, task) =>
                    sum + (task.estimated_hours || 0), 0
                );

                const overdueTasks = employeeTasks.filter(task =>
                    task.due_date < new Date()
                ).length;

                const highPriorityTasks = employeeTasks.filter(task =>
                    task.priority === PRIORITY_TYPE.HIGH
                ).length;

                return {
                    employeeId: employee._id.toString(),
                    employeeName: employee.name,
                    totalTasks: employeeTasks.length,
                    totalEstimatedHours: totalHours,
                    overdueTasks,
                    highPriorityTasks,
                    workloadScore: this.calculateWorkloadScore(employeeTasks.length, totalHours, overdueTasks, highPriorityTasks)
                };
            })
        );

        return {
            status: true,
            message: 'Workload distribution retrieved successfully',
            data: {
                distribution: workloadData,
                averageTasksPerEmployee: workloadData.length > 0
                    ? Math.round(workloadData.reduce((sum, emp) => sum + emp.totalTasks, 0) / workloadData.length)
                    : 0,
                totalDepartmentTasks: workloadData.reduce((sum, emp) => sum + emp.totalTasks, 0)
            }
        };
    }

    async getDepartmentOverview(userId: string, departmentId: string, params: DashboardParamsDto): Promise<any> {
        const timeRange = params.timeRange || TimeRange.MONTHLY;
        const dateRange = this.getDateRangeFilter(timeRange);

        const departmentQuery: any = { department_id: new Types.ObjectId(departmentId) };
        if (dateRange) {
            departmentQuery.createdAt = dateRange;
        }

        const [totalTasks, completedTasks, overdueTasks, routineTasks] = await Promise.all([
            this.taskModel.countDocuments(departmentQuery),
            this.taskModel.countDocuments({ ...departmentQuery, status: TASK_STATUS.DONE }),
            this.taskModel.countDocuments({
                ...departmentQuery,
                due_date: { $lt: new Date() },
                status: { $ne: TASK_STATUS.DONE }
            }),
            this.taskModel.countDocuments({ ...departmentQuery, isRoutineTask: true })
        ]);

        const departmentProjects = await this.projectModel.find({
            departments: { $in: [new Types.ObjectId(departmentId)] }
        }).exec();

        const projectStats = {
            totalProjects: departmentProjects.length,
            ongoingProjects: departmentProjects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length,
            completedProjects: departmentProjects.filter(p => p.status === ProjectStatus.COMPLETED).length,
            delayedProjects: departmentProjects.filter(p =>
                new Date(p.endDate) < new Date() && p.status !== ProjectStatus.COMPLETED
            ).length
        };

        return {
            status: true,
            message: 'Department overview retrieved successfully',
            data: {
                taskStats: {
                    total: totalTasks,
                    completed: completedTasks,
                    overdue: overdueTasks,
                    routine: routineTasks,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                },
                projectStats,
                departmentHealth: this.calculateDepartmentHealth(totalTasks, completedTasks, overdueTasks, projectStats)
            }
        };
    }

    // Helper methods
    private async getMessages(userId: string): Promise<MessagePreview[]> {
        return [];
    }

    private formatTimeToHHMMSS(totalHours: number): string {
        const hours = Math.floor(totalHours);
        const minutes = Math.floor((totalHours % 1) * 60);
        const seconds = Math.floor(((totalHours % 1) * 60 % 1) * 60);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Rewritten helper methods based on company settings schema
    private getDayWorkingHours(date: Date, companySettings: any): { startTime: string; endTime: string; isWorkingDay: boolean; breakTimeMinutes: number } {
        const { workSettings } = companySettings;

        if (!workSettings || !workSettings.dayWorkingHours || !Array.isArray(workSettings.dayWorkingHours)) {
            return {
                startTime: '09:00',
                endTime: '17:00',
                isWorkingDay: true,
                breakTimeMinutes: workSettings?.defaultBreakTimeMinutes || 60
            };
        }

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;
        const dayWorkingHours = workSettings.dayWorkingHours.find(
            (day: any) => day.day === dayName
        );

        if (!dayWorkingHours) {
            return {
                startTime: '09:00',
                endTime: '17:00',
                isWorkingDay: true,
                breakTimeMinutes: workSettings.defaultBreakTimeMinutes || 60
            };
        }

        return {
            startTime: dayWorkingHours.startTime || '09:00',
            endTime: dayWorkingHours.endTime || '17:00',
            isWorkingDay: dayWorkingHours.isWorkingDay || false,
            breakTimeMinutes: dayWorkingHours.breakTimeMinutes || workSettings.defaultBreakTimeMinutes || 60
        };
    }

    private calculateDailyWorkingHours(dayWorkingHours: { startTime: string; endTime: string; isWorkingDay: boolean; breakTimeMinutes: number }): number {
        if (!dayWorkingHours.isWorkingDay) {
            return 0;
        }

        const [startHour, startMinute] = dayWorkingHours.startTime.split(':').map(Number);
        const [endHour, endMinute] = dayWorkingHours.endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        const totalMinutes = endMinutes - startMinutes;
        const workingMinutes = totalMinutes - dayWorkingHours.breakTimeMinutes;

        return Math.max(0, workingMinutes / 60);
    }

    private isWithinShift(start: Date, end: Date, companySettings: any): boolean {
        const dayWorkingHours = this.getDayWorkingHours(start, companySettings);

        // If it's not a working day, return false
        if (!dayWorkingHours.isWorkingDay) {
            return false;
        }

        const shiftStart = dayWorkingHours.startTime;
        const shiftEnd = dayWorkingHours.endTime;

        // Validate time format
        if (!shiftStart || !shiftEnd || !shiftStart.includes(':') || !shiftEnd.includes(':')) {
            return true; // Default to allowing if format is invalid
        }

        const startParts = shiftStart.split(':');
        const endParts = shiftEnd.split(':');

        // Ensure we have valid parts
        if (startParts.length < 2 || endParts.length < 2) {
            return true;
        }

        const startHours = parseInt(startParts[0]);
        const startMinutes = parseInt(startParts[1]);
        const endHours = parseInt(endParts[0]);
        const endMinutes = parseInt(endParts[1]);

        // Validate parsed values
        if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
            return true;
        }

        const sessionStartHours = start.getHours();
        const sessionStartMinutes = start.getMinutes();
        const sessionEndHours = end.getHours();
        const sessionEndMinutes = end.getMinutes();

        const shiftStartMinutes = startHours * 60 + startMinutes;
        const shiftEndMinutes = endHours * 60 + endMinutes;
        const sessionStartTotalMinutes = sessionStartHours * 60 + sessionStartMinutes;
        const sessionEndTotalMinutes = sessionEndHours * 60 + sessionEndMinutes;

        // Handle overnight shifts (e.g., night shifts that cross midnight)
        if (shiftEndMinutes < shiftStartMinutes) {
            // Overnight shift
            return (sessionStartTotalMinutes >= shiftStartMinutes || sessionStartTotalMinutes <= shiftEndMinutes) &&
                (sessionEndTotalMinutes >= shiftStartMinutes || sessionEndTotalMinutes <= shiftEndMinutes);
        }

        // Regular shift within the same day
        return sessionStartTotalMinutes >= shiftStartMinutes && sessionEndTotalMinutes <= shiftEndMinutes;
    }

    private calculateBreakTime(timeLogs: Array<{ start: Date; end: Date }>, companySettings: any): number {
        if (timeLogs.length <= 1) return 0;

        const sortedLogs = timeLogs.sort((a, b) => a.start.getTime() - b.start.getTime());
        let totalBreakTime = 0;

        for (let i = 0; i < sortedLogs.length - 1; i++) {
            const currentEnd = sortedLogs[i].end;
            const nextStart = sortedLogs[i + 1].start;
            const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

            // Check if this gap is within working hours using company settings
            if (this.isWithinShift(currentEnd, nextStart, companySettings)) {
                totalBreakTime += gapMinutes;
            }
        }

        return totalBreakTime / 60; // Convert to hours
    }

    private calculateTimelinePosition(
        startTime: Date,
        endTime: Date,
        shiftStart: string,
        shiftEnd: string
    ): { position: number; width: number } {
        // Handle undefined/null values with defaults
        if (!shiftStart || !shiftEnd) {
            shiftStart = '09:00';
            shiftEnd = '17:00';
        }

        // Validate time format
        if (!shiftStart.includes(':') || !shiftEnd.includes(':')) {
            return { position: 0, width: 100 };
        }

        const startParts = shiftStart.split(':');
        const endParts = shiftEnd.split(':');

        if (startParts.length < 2 || endParts.length < 2) {
            return { position: 0, width: 100 };
        }

        const [startHour, startMinute] = startParts.map(Number);
        const [endHour, endMinute] = endParts.map(Number);

        if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
            return { position: 0, width: 100 };
        }

        const shiftStartMinutes = startHour * 60 + startMinute;
        const shiftEndMinutes = endHour * 60 + endMinute;
        const shiftDurationMinutes = shiftEndMinutes - shiftStartMinutes;

        if (shiftDurationMinutes <= 0) {
            return { position: 0, width: 100 };
        }

        const taskStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const taskEndMinutes = endTime.getHours() * 60 + endTime.getMinutes();

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

    private calculateTaskProgress(task: any, companySettings: any): number {
        if (task.status === TASK_STATUS.DONE) {
            return 100;
        }

        if (companySettings.progressCalculationMethod === ProgressCalculationMethod.TIME_BASED) {
            if (task.estimated_hours && task.estimated_hours > 0 && task.actual_hours) {
                const progress = (task.actual_hours / task.estimated_hours) * 100;
                return Math.min(progress, 100);
            }
        } else {
            if (task.start_date && task.expected_end_date) {
                const now = new Date();
                const startDate = new Date(task.start_date);
                const endDate = new Date(task.actual_end_date || task.expected_end_date);

                const totalDuration = endDate.getTime() - startDate.getTime();
                const elapsedDuration = now.getTime() - startDate.getTime();

                if (totalDuration > 0) {
                    const progress = (elapsedDuration / totalDuration) * 100;
                    return Math.min(Math.max(progress, 0), 100);
                }
            }
        }

        return 0;
    }

    private calculateProductivityScore(workedHours: number, expectedHours: number, efficiency: number): number {
        const hoursScore = expectedHours > 0 ? Math.min((workedHours / expectedHours) * 50, 50) : 0;
        const efficiencyScore = Math.min(efficiency * 0.5, 50);
        return Math.round(hoursScore + efficiencyScore);
    }

    private calculatePriorityScore(priority: string, dueDate: Date): number {
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let priorityWeight = 1;
        switch (priority) {
            case PRIORITY_TYPE.HIGH:
                priorityWeight = 3;
                break;
            case PRIORITY_TYPE.MEDIUM:
                priorityWeight = 2;
                break;
            default:
                priorityWeight = 1;
        }

        const urgencyScore = daysUntilDue <= 1 ? 3 : daysUntilDue <= 3 ? 2 : 1;
        return priorityWeight * urgencyScore;
    }

    private calculateProjectHealth(project: any, totalTasks: number, completedTasks: number, hoursSpent: number): 'excellent' | 'good' | 'warning' | 'critical' {
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const now = new Date();
        const endDate = new Date(project.endDate);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (completionRate >= 90) return 'excellent';
        if (completionRate >= 70 && daysRemaining > 7) return 'good';
        if (completionRate >= 50 && daysRemaining > 3) return 'warning';
        return 'critical';
    }

    private isProjectOnTrack(project: any, progress: number, companySettings: any): boolean {
        const now = new Date();
        const startDate = new Date(project.startDate);
        const endDate = new Date(project.endDate);

        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedDuration = now.getTime() - startDate.getTime();
        const expectedProgress = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;

        return progress >= expectedProgress * 0.9;
    }

    private async calculateDaysRemaining(endDate: Date, companySettings: any): Promise<number> {
        return this.companySettingsService.calculateWorkingDaysBetween(new Date(), endDate);
    }

    private estimateProjectCompletion(project: any, progress: number, companySettings: any): Date {
        if (progress === 0) return new Date(project.endDate);

        const now = new Date();
        const startDate = new Date(project.startDate);
        const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const estimatedTotalDays = (elapsedDays / progress) * 100;

        const estimatedEndDate = new Date(startDate);
        estimatedEndDate.setDate(startDate.getDate() + estimatedTotalDays);

        return estimatedEndDate;
    }

    private async getWorkingDaysCount(timeRange: TimeRange, companySettings: any): Promise<number> {
        const now = new Date();
        let startDate = new Date();

        switch (timeRange) {
            case TimeRange.WEEKLY:
                startDate.setDate(now.getDate() - 7);
                break;
            case TimeRange.MONTHLY:
                startDate.setMonth(now.getMonth() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        return this.companySettingsService.calculateWorkingDaysBetween(startDate, now);
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

    private calculateWorkloadScore(totalTasks: number, totalHours: number, overdueTasks: number, highPriorityTasks: number): number {
        const taskWeight = totalTasks * 1;
        const hourWeight = totalHours * 0.5;
        const overdueWeight = overdueTasks * 3;
        const priorityWeight = highPriorityTasks * 2;

        return Math.round(taskWeight + hourWeight + overdueWeight + priorityWeight);
    }

    private calculateDepartmentHealth(totalTasks: number, completedTasks: number, overdueTasks: number, projectStats: any): 'excellent' | 'good' | 'warning' | 'critical' {
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;
        const projectDelayRate = projectStats.totalProjects > 0 ? (projectStats.delayedProjects / projectStats.totalProjects) * 100 : 0;

        if (completionRate >= 90 && overdueRate <= 5 && projectDelayRate <= 10) return 'excellent';
        if (completionRate >= 75 && overdueRate <= 15 && projectDelayRate <= 20) return 'good';
        if (completionRate >= 60 && overdueRate <= 25 && projectDelayRate <= 35) return 'warning';
        return 'critical';
    }

    private calculateProgressTrend(tasks: any[], timeRange: TimeRange, companySettings: any): any[] {
        const dates = this.getDateRange(timeRange);

        return dates.map(date => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayTasks = tasks.filter(task => {
                const taskDate = new Date(task.createdAt);
                return taskDate >= date && taskDate < nextDay;
            });

            const avgProgress = dayTasks.length > 0
                ? dayTasks.reduce((sum, task) => sum + this.calculateTaskProgress(task, companySettings), 0) / dayTasks.length
                : 0;

            return {
                date: date.toISOString().split('T')[0],
                progress: Math.round(avgProgress),
                taskCount: dayTasks.length,
                completedCount: dayTasks.filter(task => task.status === TASK_STATUS.DONE).length
            };
        });
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