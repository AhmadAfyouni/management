import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Task, TaskDocument } from '../task/schema/task.schema';
import { JobTitles, JobTitlesDocument } from '../job-titles/schema/job-ttiles.schema';
import { Emp, EmpDocument } from '../emp/schemas/emp.schema';
import { TASK_STATUS } from '../task/enums/task-status.enum';
import { PRIORITY_TYPE } from '../task/enums/priority.enum';

@Injectable()
export class RoutineTaskService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(JobTitles.name) private jobTitlesModel: Model<JobTitlesDocument>,
    @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
  ) {}

  async generateRoutineTasksForNewEmployee(empId: string): Promise<void> {
    const employee = await this.empModel.findById(empId).populate('job_id');
    if (!employee || !employee.job_id) {
      return;
    }

    const jobTitle = employee.job_id as any;
    if (!jobTitle.hasRoutineTasks || !jobTitle.autoGenerateRoutineTasks) {
      return;
    }

    // Check if employee already has routine tasks
    const existingRoutineTasks = await this.taskModel.findOne({
      emp: empId,
      isRoutineTask: true,
    });

    if (existingRoutineTasks) {
      return; // Already has routine tasks
    }

    // Create main routine task container
    const mainRoutineTask = new this.taskModel({
      name: `Routine Tasks – ${jobTitle.title}`,
      description: `Automated routine tasks for ${jobTitle.title} position`,
      emp: empId,
      assignee: empId,
      department_id: employee.department_id,
      status: TASK_STATUS.ONGOING,
      priority: PRIORITY_TYPE.MEDIUM,
      isRoutineTask: true,
      routineTaskId: `routine_${empId}_${jobTitle._id}`,
      start_date: new Date(),
      due_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      expected_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isRecurring: true,
      recurringType: 'daily', // This is just the container
      isActive: true,
    });

    const savedMainTask = await mainRoutineTask.save();

    // Generate first set of routine subtasks
    await this.generateRoutineSubTasks(empId, jobTitle.routineTasks, savedMainTask._id);
  }

  private async generateRoutineSubTasks(
    empId: string, 
    routineTasks: any[], 
    parentTaskId: Types.ObjectId
  ): Promise<void> {
    const employee = await this.empModel.findById(empId);
    if (!employee) return;

    for (const routineTask of routineTasks) {
      if (!routineTask.isActive) continue;

      const dueDate = this.calculateNextDueDate(routineTask.recurringType, routineTask.intervalDays);
      
      const subTask = new this.taskModel({
        name: routineTask.name,
        description: routineTask.description,
        emp: empId,
        assignee: empId,
        department_id: employee.department_id,
        parent_task: parentTaskId,
        status: TASK_STATUS.PENDING,
        priority: this.mapPriority(routineTask.priority),
        isRoutineTask: true,
        routineTaskId: `routine_${empId}_${parentTaskId}`,
        start_date: new Date(),
        due_date: dueDate,
        expected_end_date: dueDate,
        estimated_hours: routineTask.estimatedHours || 0,
        isRecurring: true,
        recurringType: routineTask.recurringType,
        intervalInDays: routineTask.intervalDays,
        isActive: true,
      });

      const savedSubTask = await subTask.save();

      // Generate sub-subtasks if needed
      if (routineTask.hasSubTasks && routineTask.subTasks?.length > 0) {
        await this.generateSubSubTasks(empId, routineTask.subTasks, savedSubTask._id);
      }

      // Update main task's sub_tasks array
      await this.taskModel.findByIdAndUpdate(
        parentTaskId,
        { $push: { sub_tasks: savedSubTask._id } }
      );
    }
  }

  private async generateSubSubTasks(
    empId: string,
    subTasks: any[],
    parentSubTaskId: Types.ObjectId
  ): Promise<void> {
    const employee = await this.empModel.findById(empId);
    if (!employee) return;

    for (const subTask of subTasks) {
      const subSubTask = new this.taskModel({
        name: subTask.name,
        description: subTask.description,
        emp: empId,
        assignee: empId,
        department_id: employee.department_id,
        parent_task: parentSubTaskId,
        status: TASK_STATUS.PENDING,
        priority: PRIORITY_TYPE.LOW,
        isRoutineTask: true,
        start_date: new Date(),
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        expected_end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        estimated_hours: subTask.estimatedHours || 0,
        isActive: true,
      });

      const savedSubSubTask = await subSubTask.save();

      // Update parent subtask's sub_tasks array
      await this.taskModel.findByIdAndUpdate(
        parentSubTaskId,
        { $push: { sub_tasks: savedSubSubTask._id } }
      );
    }
  }

  @Cron('0 1 * * *') // Run daily at 1 AM
  async generateDailyRoutineTasks(): Promise<void> {
    await this.generateScheduledRoutineTasks('daily');
  }

  @Cron('0 2 * * 1') // Run weekly on Monday at 2 AM
  async generateWeeklyRoutineTasks(): Promise<void> {
    await this.generateScheduledRoutineTasks('weekly');
  }

  @Cron('0 3 1 * *') // Run monthly on 1st at 3 AM
  async generateMonthlyRoutineTasks(): Promise<void> {
    await this.generateScheduledRoutineTasks('monthly');
  }

  @Cron('0 4 1 1 *') // Run yearly on Jan 1st at 4 AM
  async generateYearlyRoutineTasks(): Promise<void> {
    await this.generateScheduledRoutineTasks('yearly');
  }

  private async generateScheduledRoutineTasks(type: string): Promise<void> {
    // Find all employees with routine tasks of this type
    const employeesWithRoutineTasks = await this.empModel.find({
      isActive: true // Assuming there's an isActive field
    }).populate('job_id');

    for (const employee of employeesWithRoutineTasks) {
      const jobTitle = employee.job_id as any;
      if (!jobTitle?.hasRoutineTasks || !jobTitle?.autoGenerateRoutineTasks) {
        continue;
      }

      // Check for routine tasks of this type
      const routineTasksOfType = jobTitle.routineTasks.filter(
        (task: any) => task.recurringType === type && task.isActive
      );

      if (routineTasksOfType.length === 0) {
        continue;
      }

      // Find the main routine task for this employee
      const mainRoutineTask = await this.taskModel.findOne({
        emp: employee._id,
        isRoutineTask: true,
        parent_task: null,
      });

      if (!mainRoutineTask) {
        continue;
      }

      // Check if tasks for today were already generated
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      for (const routineTask of routineTasksOfType) {
        const existingTaskToday = await this.taskModel.findOne({
          emp: employee._id,
          isRoutineTask: true,
          parent_task: mainRoutineTask._id,
          name: routineTask.name,
          createdAt: { $gte: startOfDay, $lt: endOfDay }
        });

        if (!existingTaskToday) {
          // Generate new task for today
          await this.generateRoutineSubTasks(
            employee._id.toString(),
            [routineTask],
            mainRoutineTask._id
          );
        }
      }
    }
  }

  private calculateNextDueDate(recurringType: string, intervalDays: number): Date {
    const now = new Date();
    
    switch (recurringType) {
      case 'daily':
        return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + intervalDays * 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + intervalDays);
        return nextMonth;
      case 'yearly':
        const nextYear = new Date(now);
        nextYear.setFullYear(now.getFullYear() + intervalDays);
        return nextYear;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private mapPriority(priority: string): PRIORITY_TYPE {
    switch (priority) {
      case 'low':
        return PRIORITY_TYPE.LOW;
      case 'high':
        return PRIORITY_TYPE.HIGH;
      case 'medium':
      default:
        return PRIORITY_TYPE.MEDIUM;
    }
  }

  async pauseRoutineTasksForEmployee(empId: string): Promise<void> {
    await this.taskModel.updateMany(
      { emp: empId, isRoutineTask: true, status: { $ne: TASK_STATUS.DONE } },
      { isActive: false }
    );
  }

  async resumeRoutineTasksForEmployee(empId: string): Promise<void> {
    await this.taskModel.updateMany(
      { emp: empId, isRoutineTask: true },
      { isActive: true }
    );
  }

  async getRoutineTasksForEmployee(empId: string): Promise<TaskDocument[]> {
    return await this.taskModel.find({
      emp: empId,
      isRoutineTask: true
    }).populate('parent_task').populate('sub_tasks');
  }
}
