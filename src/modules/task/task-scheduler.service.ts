import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dtos/create-task.dto';
import { Task, TaskDocument } from './schema/task.schema';
import { Emp, EmpDocument } from '../emp/schemas/emp.schema';
import { SectionService } from '../section/section.service';
import { NotificationService } from '../notification/notification.service';
import { TASK_STATUS } from './enums/task-status.enum';
import { PRIORITY_TYPE } from './enums/priority.enum';
import { RoutineTaskStats } from './interfaces/scheduler.interface';
import { TaskCoreService } from './task-core.service';
import { JobTitles, JobTitlesDocument, RoutineTask } from '../job-titles/schema/job-ttiles.schema';

@Injectable()
export class TaskSchedulerService {
    private readonly logger = new Logger(TaskSchedulerService.name);
    private isRunning = false;
    private lastRunStats: RoutineTaskStats | null = null;

    constructor(
        private readonly taskCoreService: TaskCoreService,
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(JobTitles.name) private jobTitlesModel: Model<JobTitlesDocument>,
        @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
        private readonly sectionService: SectionService,
        private readonly notificationService: NotificationService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleScheduledTasks() {
        if (this.isRunning) {
            this.logger.warn('Previous task generation is still running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            this.logger.log('Starting scheduled task generation...');

            // Handle regular recurring tasks
            await this.createScheduledTasks();

            // Handle routine tasks from job titles
            const routineStats = await this.generateRoutineTasks();

            const executionTime = Date.now() - startTime;
            this.lastRunStats = {
                ...routineStats,
                executionTime,
                lastRun: new Date(),
            };

            this.logger.log(`Scheduled task generation completed in ${executionTime}ms`, this.lastRunStats);
        } catch (error) {
            this.logger.error('Failed to complete scheduled task generation', error);
        } finally {
            this.isRunning = false;
        }
    }

    private async createScheduledTasks() {
        try {
            const recurringTasks = await this.getRecurringTasks();
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

            for (const task of recurringTasks) {
                if (!task.isRecurring || !task.isActive) {
                    continue;
                }

                const shouldCreateToday = this.shouldCreateTaskToday(task, today);

                if (shouldCreateToday) {
                    // Check if task was already created today
                    const existingTask = await this.taskModel.findOne({
                        emp: task.emp,
                        name: task.name,
                        isRecurring: false, // This is the generated instance
                        createdAt: {
                            $gte: today,
                            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                        },
                    });

                    if (!existingTask) {
                        const taskData: CreateTaskDto = {
                            name: task.name,
                            description: task.description,
                            priority: task.priority,
                            emp: task.emp?.toString(),
                            status: TASK_STATUS.PENDING,
                            due_date: this.calculateNextDueDate(task.recurringType!, task.intervalInDays || 1),
                            start_date: new Date(),
                            files: task.files || [],
                            estimated_hours: task.estimated_hours,
                            isRecurring: false, // Generated instance is not recurring
                            isRoutineTask: false,
                            project_id: task.project_id?.toString(),
                            department_id: task.department_id?.toString(),
                        };

                        await this.taskCoreService.createTaskForEmp(taskData);
                        this.logger.log(`Created scheduled task: ${task.name} for employee: ${task.emp}`);
                    }
                }
            }

            this.logger.log('Scheduled tasks processed successfully.');
        } catch (error) {
            this.logger.error('Failed to create scheduled tasks', error);
            throw error;
        }
    }

    private async getRecurringTasks(): Promise<TaskDocument[]> {
        try {
            return await this.taskModel
                .find({ isRecurring: true, isActive: true })
                .populate([
                    { path: 'emp', model: 'Emp' },
                    { path: 'department_id', model: 'Department' },
                    { path: 'project_id', model: 'Project' },
                ])
                .exec();
        } catch (error) {
            this.logger.error('Failed to fetch recurring tasks', error);
            throw error;
        }
    }

    /**
     * Generate routine tasks based on job titles
     */
    private async generateRoutineTasks(): Promise<RoutineTaskStats> {
        const stats: RoutineTaskStats = {
            totalEmployees: 0,
            activeEmployees: 0,
            tasksGenerated: 0,
            errors: 0,
            executionTime: 0,
            lastRun: new Date(),
        };

        try {
            // Get all employees with job titles that have routine tasks
            const employees = await this.empModel
                .find({})
                .populate({
                    path: 'job_id',
                    model: 'JobTitles',
                    match: { hasRoutineTasks: true, autoGenerateRoutineTasks: true },
                })
                .exec();

            stats.totalEmployees = employees.length;

            for (const employee of employees) {
                if (!employee.job_id) {
                    continue;
                }

                stats.activeEmployees++;

                try {
                    const tasksCreated = await this.generateRoutineTasksForEmployee(employee);
                    stats.tasksGenerated += tasksCreated;
                } catch (error) {
                    stats.errors++;
                    this.logger.error(`Failed to generate routine tasks for employee ${employee._id}:`, error);
                }
            }

            this.logger.log(`Routine task generation completed. Stats:`, stats);
            return stats;
        } catch (error) {
            this.logger.error('Failed to generate routine tasks:', error);
            throw error;
        }
    }

    /**
     * Generate routine tasks for a specific employee
     */
    private async generateRoutineTasksForEmployee(employee: any): Promise<number> {
        const jobTitle = employee.job_id as any;
        let tasksCreated = 0;

        if (!jobTitle?.routineTasks?.length) {
            return tasksCreated;
        }

        // Find or create main routine task container
        let mainRoutineTask = await this.taskModel.findOne({
            emp: employee._id,
            isRoutineTask: true,
            parent_task: null,
            routineTaskId: { $regex: `^routine_main_${employee._id}` },
        });

        if (!mainRoutineTask) {
            mainRoutineTask = await this.createMainRoutineTaskContainer(employee, jobTitle);
            tasksCreated++;
        }

        // Process each routine task definition
        for (const routineTaskDef of jobTitle.routineTasks) {
            if (!routineTaskDef.isActive) {
                continue;
            }

            const shouldGenerate = this.shouldGenerateRoutineTask(routineTaskDef);
            if (!shouldGenerate) {
                continue;
            }

            // Check if task already exists for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

            const existingTask = await this.taskModel.findOne({
                emp: employee._id,
                parent_task: mainRoutineTask._id,
                name: routineTaskDef.name,
                isRoutineTask: true,
                createdAt: { $gte: today, $lt: tomorrow },
            });

            if (!existingTask) {
                await this.createRoutineTaskInstance(employee, routineTaskDef, mainRoutineTask._id);
                tasksCreated++;

                // Create subtasks if defined
                if (routineTaskDef.hasSubTasks && routineTaskDef.subTasks?.length > 0) {
                    const subTasksCreated = await this.createRoutineSubTasks(
                        employee,
                        routineTaskDef.subTasks,
                        mainRoutineTask._id,
                    );
                    tasksCreated += subTasksCreated;
                }
            }
        }

        return tasksCreated;
    }

    /**
     * Create main routine task container for employee
     */
    private async createMainRoutineTaskContainer(employee: any, jobTitle: any): Promise<TaskDocument> {
        // Get section for the employee
        const sections = await this.sectionService.createInitialSections(employee._id.toString(), employee._id.toString());

        const mainTask = new this.taskModel({
            name: `📋 Daily Routine – ${jobTitle.title}`,
            description: `Routine tasks for ${jobTitle.title} position`,
            emp: employee._id,
            assignee: employee._id,
            department_id: employee.department_id,
            section_id: (sections[0] as any)._id,
            manager_section_id: (sections[1] as any)._id,
            status: TASK_STATUS.ONGOING,
            priority: PRIORITY_TYPE.MEDIUM,
            isRoutineTask: true,
            routineTaskId: `routine_main_${employee._id}_${jobTitle._id}`,
            start_date: new Date(),
            due_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            expected_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isRecurring: true,
            recurringType: 'daily',
            isActive: true,
            progress: 0,
            sub_tasks: [],
        });

        const savedTask = await mainTask.save();

        // Send notification
        await this.notificationService.notifyTaskCreated(
            savedTask,
            employee._id.toString(),
            employee._id.toString(),
        );

        return savedTask;
    }

    /**
     * Create routine task instance from definition
     */
    private async createRoutineTaskInstance(
        employee: any,
        routineTaskDef: RoutineTask,
        parentTaskId: Types.ObjectId,
    ): Promise<TaskDocument> {
        const dueDate = this.calculateRoutineTaskDueDate(routineTaskDef);
        const sections = await this.sectionService.createInitialSections(employee._id.toString(), employee._id.toString());

        const task = new this.taskModel({
            name: routineTaskDef.name,
            description: routineTaskDef.description,
            emp: employee._id,
            assignee: employee._id,
            department_id: employee.department_id,
            section_id: (sections[0] as any)._id,
            manager_section_id: (sections[1] as any)._id,
            parent_task: parentTaskId,
            status: TASK_STATUS.PENDING,
            priority: this.mapPriority(routineTaskDef.priority),
            isRoutineTask: true,
            routineTaskId: `routine_${employee._id}_${Date.now()}`,
            start_date: new Date(),
            due_date: dueDate,
            expected_end_date: dueDate,
            estimated_hours: routineTaskDef.estimatedHours || 0,
            isRecurring: false, // Instance is not recurring
            isActive: true,
            progress: 0,
            sub_tasks: [],
        });

        const savedTask = await task.save();

        // Update parent task's sub_tasks array
        await this.taskModel.findByIdAndUpdate(parentTaskId, { $addToSet: { sub_tasks: savedTask._id } });

        return savedTask;
    }

    /**
     * Create routine subtasks
     */
    private async createRoutineSubTasks(
        employee: any,
        subTaskDefs: any[],
        parentTaskId: Types.ObjectId,
    ): Promise<number> {
        let created = 0;
        const sections = await this.sectionService.createInitialSections(employee._id.toString(), employee._id.toString());

        for (const subTaskDef of subTaskDefs) {
            const subTask = new this.taskModel({
                name: subTaskDef.name,
                description: subTaskDef.description,
                emp: employee._id,
                assignee: employee._id,
                department_id: employee.department_id,
                section_id: (sections[0] as any)._id,
                manager_section_id: (sections[1] as any)._id,
                parent_task: parentTaskId,
                status: TASK_STATUS.PENDING,
                priority: PRIORITY_TYPE.LOW,
                isRoutineTask: true,
                start_date: new Date(),
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                expected_end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                estimated_hours: subTaskDef.estimatedHours || 0,
                isActive: true,
                progress: 0,
            });

            await subTask.save();
            created++;

            // Update parent's sub_tasks array
            await this.taskModel.findByIdAndUpdate(parentTaskId, { $addToSet: { sub_tasks: subTask._id } });
        }

        return created;
    }

    /**
     * Check if task should be created today based on recurring pattern
     */
    private shouldCreateTaskToday(task: TaskDocument, today: Date): boolean {
        if (!task.recurringType || !task.intervalInDays) {
            return false;
        }

        const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));

        switch (task.recurringType) {
            case 'daily':
                return daysSinceEpoch % task.intervalInDays === 0;
            case 'weekly':
                return today.getDay() === 1 && Math.floor(daysSinceEpoch / 7) % Math.ceil(task.intervalInDays / 7) === 0;
            case 'monthly':
                return today.getDate() === 1 && today.getMonth() % task.intervalInDays === 0;
            case 'yearly':
                return today.getMonth() === 0 && today.getDate() === 1 && today.getFullYear() % task.intervalInDays === 0;
            default:
                return false;
        }
    }

    /**
     * Check if routine task should be generated today
     */
    private shouldGenerateRoutineTask(routineTaskDef: RoutineTask): boolean {
        const today = new Date();
        const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
        const intervalDays = routineTaskDef.intervalDays || 1;

        switch (routineTaskDef.recurringType) {
            case 'daily':
                return daysSinceEpoch % intervalDays === 0;
            case 'weekly':
                return today.getDay() === 1 && Math.floor(daysSinceEpoch / 7) % Math.ceil(intervalDays / 7) === 0;
            case 'monthly':
                return today.getDate() === 1 && today.getMonth() % intervalDays === 0;
            case 'yearly':
                return today.getMonth() === 0 && today.getDate() === 1 && today.getFullYear() % intervalDays === 0;
            default:
                return false;
        }
    }

    /**
     * Calculate next due date for recurring task
     */
    private calculateNextDueDate(recurringType: string, intervalInDays: number): Date {
        const now = new Date();

        switch (recurringType) {
            case 'daily':
                return new Date(now.getTime() + intervalInDays * 24 * 60 * 60 * 1000);
            case 'weekly':
                return new Date(now.getTime() + intervalInDays * 7 * 24 * 60 * 60 * 1000);
            case 'monthly':
                const nextMonth = new Date(now);
                nextMonth.setMonth(now.getMonth() + intervalInDays);
                return nextMonth;
            case 'yearly':
                const nextYear = new Date(now);
                nextYear.setFullYear(now.getFullYear() + intervalInDays);
                return nextYear;
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }

    /**
     * Calculate due date for routine task
     */
    private calculateRoutineTaskDueDate(routineTaskDef: RoutineTask): Date {
        const now = new Date();
        const intervalDays = routineTaskDef.intervalDays || 1;

        switch (routineTaskDef.recurringType) {
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Due tomorrow
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Due next week
            case 'monthly':
                const nextMonth = new Date(now);
                nextMonth.setMonth(now.getMonth() + 1);
                return nextMonth;
            case 'yearly':
                const nextYear = new Date(now);
                nextYear.setFullYear(now.getFullYear() + 1);
                return nextYear;
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }

    /**
     * Map priority string to enum
     */
    private mapPriority(priority: string): PRIORITY_TYPE {
        switch (priority?.toLowerCase()) {
            case 'low':
                return PRIORITY_TYPE.LOW;
            case 'high':
                return PRIORITY_TYPE.HIGH;
            case 'medium':
            default:
                return PRIORITY_TYPE.MEDIUM;
        }
    }

    /**
     * Get last run statistics
     */
    getLastRunStats(): RoutineTaskStats | null {
        return this.lastRunStats;
    }

    /**
     * Manual trigger for routine task generation (for testing/admin purposes)
     */
    async triggerManualGeneration(): Promise<RoutineTaskStats> {
        if (this.isRunning) {
            throw new Error('Task generation is already running');
        }

        this.logger.log('Manual routine task generation triggered');
        return await this.generateRoutineTasks();
    }
}