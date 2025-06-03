import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Project, ProjectDocument } from './schema/project.schema';
import { Task, TaskDocument } from '../task/schema/task.schema';
import { Emp, EmpDocument } from '../emp/schemas/emp.schema';
import { NotificationService } from '../notification/notification.service';
import { TASK_STATUS } from '../task/enums/task-status.enum';
import { ProjectStatus } from './enums/project-status';

@Injectable()
class ProjectManagementService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
    private readonly notificationService: NotificationService,
  ) { }

  /**
   * Manually complete a project (by project manager)
   */
  async completeProject(
    projectId: string,
    managerId: string
  ): Promise<{ status: boolean; message: string }> {
    try {
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if user is project manager or admin
      const manager = await this.empModel.findById(managerId);
      if (!manager) {
        throw new Error('Manager not found');
      }

      // Update project status to completed
      project.status = ProjectStatus.COMPLETED;
      await project.save();

      // Notify relevant stakeholders
      await this.notifyProjectCompletion(project, managerId);

      return { status: true, message: 'Project completed successfully' };
    } catch (error) {
      throw new Error(`Failed to complete project: ${error.message}`);
    }
  }

  /**
   * Check project deadline notifications (runs daily)
   */
  @Cron('0 9 * * *') // Run daily at 9 AM
  async checkProjectDeadlines(): Promise<void> {
    const projects = await this.projectModel.find({
      status: { $in: [ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS] }
    }).populate('assignee');

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    for (const project of projects) {
      const endDate = new Date(project.endDate);

      // Check if project deadline is approaching (3 days)
      if (endDate <= threeDaysFromNow && endDate > now) {
        await this.notifyProjectDeadlineApproaching(project);
      }

      // Check if project is overdue
      if (endDate < now) {
        await this.notifyProjectOverdue(project);
      }
    }
  }

  /**
   * Check if all project tasks are completed and notify
   */
  @Cron('0 */2 * * *') // Run every 2 hours
  async checkCompletedProjectTasks(): Promise<void> {
    const ongoingProjects = await this.projectModel.find({
      status: { $in: [ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS] }
    });

    for (const project of ongoingProjects) {
      const allTasks = await this.taskModel.find({ project_id: project._id });
      const completedTasks = allTasks.filter(task => task.status === TASK_STATUS.DONE);

      // If all tasks are completed, notify project manager
      if (allTasks.length > 0 && completedTasks.length === allTasks.length) {
        await this.notifyAllTasksCompleted(project);
      }
    }
  }

  /**
   * Get project completion analytics
   */
  async getProjectCompletionAnalytics(projectId: string): Promise<any> {
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const allTasks = await this.taskModel.find({ project_id: projectId });
    const completedTasks = allTasks.filter(task => task.status === TASK_STATUS.DONE);
    const pendingTasks = allTasks.filter(task => task.status === TASK_STATUS.PENDING);
    const ongoingTasks = allTasks.filter(task => task.status === TASK_STATUS.ONGOING);
    const onTestTasks = allTasks.filter(task => task.status === TASK_STATUS.ON_TEST);

    const completionPercentage = allTasks.length > 0
      ? (completedTasks.length / allTasks.length) * 100
      : 0;

    const now = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    const timeProgress = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;

    // Calculate total estimated and actual hours
    const totalEstimatedHours = allTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
    const totalActualHours = allTasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);

    return {
      projectId,
      projectName: project.name,
      projectStatus: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      taskSummary: {
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        ongoingTasks: ongoingTasks.length,
        onTestTasks: onTestTasks.length,
        completionPercentage: Math.round(completionPercentage)
      },
      timeAnalytics: {
        timeProgress: Math.round(timeProgress),
        isOverdue: now > endDate,
        daysRemaining: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        totalEstimatedHours,
        totalActualHours,
        timeEfficiency: totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 0
      },
      canComplete: completedTasks.length === allTasks.length && allTasks.length > 0
    };
  }

  /**
   * Get projects requiring manager attention
   */
  async getProjectsRequiringAttention(managerId: string): Promise<any[]> {
    // Get projects where user is assignee (project manager)
    const projects = await this.projectModel.find({
      assignee: managerId,
      status: { $in: [ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS] }
    });

    let projectsRequiringAttention: any[] = [];
    const now = new Date();

    for (const project of projects) {
      const analytics = await this.getProjectCompletionAnalytics((project._id as any).toString());
      const endDate = new Date(project.endDate);
      const daysUntilDeadline = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const requiresAttention =
        analytics.canComplete || // All tasks done, needs manual completion
        daysUntilDeadline <= 7 || // Deadline approaching
        analytics.timeAnalytics.isOverdue; // Project is overdue

      if (requiresAttention) {
        projectsRequiringAttention.push({
          ...analytics,
          attentionReasons: {
            allTasksCompleted: analytics.canComplete,
            deadlineApproaching: daysUntilDeadline <= 7 && daysUntilDeadline > 0,
            isOverdue: analytics.timeAnalytics.isOverdue
          },
          daysUntilDeadline
        } as any);
      }
    }

    return projectsRequiringAttention;
  }

  /**
   * Private helper methods for notifications
   */
  private async notifyProjectCompletion(project: ProjectDocument, managerId: string): Promise<void> {
    // Notify all team members about project completion
    const projectTasks = await this.taskModel.find({ project_id: project._id }).populate('emp');
    const teamMembers = [...new Set(projectTasks.map(task => task.emp?._id.toString()).filter(Boolean))];

    for (const memberId of teamMembers) {
      if (memberId) {
        await this.notificationService.create({
          title: 'Project Completed',
          message: `Project "${project.name}" has been completed successfully.`,
          empId: memberId,
        });
      }
    }
  }

  private async notifyProjectDeadlineApproaching(project: ProjectDocument): Promise<void> {
    if (!project.assignee) return;

    const endDate = new Date(project.endDate);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    await this.notificationService.create({
      title: 'Project Deadline Approaching',
      message: `Project "${project.name}" deadline is approaching. ${daysRemaining} days remaining.`,
      empId: project.assignee.toString(),
    });
  }

  private async notifyProjectOverdue(project: ProjectDocument): Promise<void> {
    if (!project.assignee) return;

    await this.notificationService.create({
      title: 'Project Overdue',
      message: `Project "${project.name}" is overdue. Please review and update the timeline.`,
      empId: project.assignee.toString(),
    });
  }

  private async notifyAllTasksCompleted(project: ProjectDocument): Promise<void> {
    if (!project.assignee) return;

    await this.notificationService.create({
      title: 'All Project Tasks Completed',
      message: `All tasks for project "${project.name}" have been completed. You can now mark the project as complete.`,
      empId: project.assignee.toString(),
    });
  }

  /**
   * Update project timeline
   */
  async updateProjectTimeline(
    projectId: string,
    newEndDate: Date,
    managerId: string,
    reason?: string
  ): Promise<{ status: boolean; message: string }> {
    try {
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const oldEndDate = project.endDate;
      project.endDate = newEndDate;
      await project.save();

      // Notify team about timeline change
      const projectTasks = await this.taskModel.find({ project_id: project._id }).populate('emp');
      const teamMembers = [...new Set(projectTasks.map(task => task.emp?._id.toString()).filter(Boolean))];

      for (const memberId of teamMembers) {
        if (memberId) {
          await this.notificationService.create({
            title: 'Project Timeline Updated',
            message: `Project "${project.name}" timeline has been updated. New deadline: ${newEndDate.toDateString()}. ${reason ? 'Reason: ' + reason : ''}`,
            empId: memberId,
          });
        }
      }

      return { status: true, message: 'Project timeline updated successfully' };
    } catch (error) {
      throw new Error(`Failed to update project timeline: ${error.message}`);
    }
  }
}

export { ProjectManagementService };
