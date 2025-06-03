import { Controller, Get, Post, UseGuards, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles, RequiredPermissions } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { GetAccount } from 'src/common/decorators/user-guard';
import { TaskSchedulerService } from './task-scheduler.service';
import { 
    RoutineTaskStats, 
    SchedulerConfig, 
    NextRunInfo, 
    SchedulerHealthCheck,
    SchedulerStatusResponse 
} from './interfaces/scheduler.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('task-scheduler')
export class TaskSchedulerController {
    constructor(private readonly taskSchedulerService: TaskSchedulerService) { }

    /**
     * Get last run statistics for routine task generation
     */
    @Roles(UserRole.ADMIN, UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('stats')
    async getLastRunStats(): Promise<{ status: boolean; message: string; data: RoutineTaskStats | null }> {
        try {
            const stats = this.taskSchedulerService.getLastRunStats();
            return {
                status: true,
                message: 'Scheduler statistics retrieved successfully',
                data: stats || {
                    totalEmployees: 0,
                    activeEmployees: 0,
                    tasksGenerated: 0,
                    errors: 0,
                    executionTime: 0,
                    lastRun: new Date()
                }
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve scheduler statistics');
        }
    }

    /**
     * Manually trigger routine task generation (for testing/admin purposes)
     */
    @Roles(UserRole.ADMIN)
    @RequiredPermissions(PermissionsEnum.TASK_ADD)
    @Post('trigger-manual')
    async triggerManualGeneration(@GetAccount() adminId: string): Promise<{ status: boolean; message: string; data: any }> {
        try {
            const stats = await this.taskSchedulerService.triggerManualGeneration();
            return {
                status: true,
                message: 'Manual routine task generation completed successfully',
                data: {
                    ...stats,
                    triggeredBy: adminId,
                    triggeredAt: new Date()
                }
            };
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to trigger manual generation');
        }
    }

    /**
     * Check scheduler health and status
     */
    @Roles(UserRole.ADMIN, UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('status')
    async getSchedulerStatus(): Promise<{ status: boolean; message: string; data: SchedulerStatusResponse }> {
        try {
            const stats = this.taskSchedulerService.getLastRunStats();
            const now = Date.now();
            const lastRunTime = stats?.lastRun?.getTime() || 0;
            const timeSinceLastRun = now - lastRunTime;
            
            // Consider healthy if last run was within 25 hours (allowing for some delay)
            const isHealthy = timeSinceLastRun < 25 * 60 * 60 * 1000;
            
            // Calculate next expected run (next midnight)
            const nextRun = new Date();
            nextRun.setDate(nextRun.getDate() + 1);
            nextRun.setHours(0, 0, 0, 0);

            return {
                status: true,
                message: 'Scheduler status retrieved successfully',
                data: {
                    isHealthy,
                    isRunning: false, // We don't track this in current implementation
                    lastRun: stats?.lastRun || null,
                    nextRun,
                    timeSinceLastRun: Math.round(timeSinceLastRun / 1000), // in seconds
                    executionTime: stats?.executionTime || null,
                    tasksGenerated: stats?.tasksGenerated || 0,
                    totalEmployees: stats?.totalEmployees || 0,
                    activeEmployees: stats?.activeEmployees || 0,
                    errors: stats?.errors || 0,
                    successRate: stats ? 
                        (stats.activeEmployees > 0 ? 
                            Math.round(((stats.activeEmployees - stats.errors) / stats.activeEmployees) * 100) 
                            : 100) 
                        : 0
                }
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve scheduler status');
        }
    }

    /**
     * Get scheduler configuration
     */
    @Roles(UserRole.ADMIN)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('config')
    async getSchedulerConfig(): Promise<{ status: boolean; message: string; data: SchedulerConfig }> {
        try {
            return {
                status: true,
                message: 'Scheduler configuration retrieved successfully',
                data: {
                    cronSchedule: '0 0 * * *', // Every day at midnight
                    timezone: 'UTC',
                    features: {
                        routineTaskGeneration: true,
                        recurringTaskGeneration: true,
                        duplicatePrevention: true,
                        hierarchicalTasks: true,
                        notificationIntegration: true
                    },
                    limits: {
                        maxTasksPerEmployee: 100,
                        maxSubTasksPerTask: 10,
                        maxExecutionTime: 300000 // 5 minutes in ms
                    },
                    supportedRecurringTypes: ['daily', 'weekly', 'monthly', 'yearly'],
                    supportedPriorities: ['low', 'medium', 'high']
                }
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve scheduler configuration');
        }
    }

    /**
     * Get next scheduled execution time
     */
    @Roles(UserRole.ADMIN, UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('next-run')
    async getNextRunTime(): Promise<{ status: boolean; message: string; data: NextRunInfo }> {
        try {
            const now = new Date();
            const nextRun = new Date();
            
            // If it's before midnight today, next run is today at midnight
            // Otherwise, next run is tomorrow at midnight
            if (now.getHours() === 0 && now.getMinutes() < 5) {
                // If it's very early morning, next run is tomorrow
                nextRun.setDate(nextRun.getDate() + 1);
            } else {
                // Next run is next midnight
                nextRun.setDate(nextRun.getDate() + 1);
            }
            
            nextRun.setHours(0, 0, 0, 0);
            
            const timeUntilNext = nextRun.getTime() - now.getTime();
            
            return {
                status: true,
                message: 'Next execution time retrieved successfully',
                data: {
                    nextRun,
                    timeUntilNext: Math.round(timeUntilNext / 1000), // in seconds
                    formattedTimeUntil: this.formatDuration(timeUntilNext),
                    cronExpression: '0 0 * * *',
                    timezone: 'UTC'
                }
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to get next run time');
        }
    }

    /**
     * Get scheduler health check
     */
    @Roles(UserRole.ADMIN)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('health')
    async getHealthCheck(): Promise<{ status: boolean; message: string; data: SchedulerHealthCheck }> {
        try {
            const stats = this.taskSchedulerService.getLastRunStats();
            const now = Date.now();
            const lastRunTime = stats?.lastRun?.getTime() || 0;
            const timeSinceLastRun = now - lastRunTime;
            
            const isHealthy = timeSinceLastRun < 25 * 60 * 60 * 1000; // 25 hours
            const status = isHealthy ? 'healthy' : 'unhealthy';
            
            return {
                status: true,
                message: `Scheduler is ${status}`,
                data: {
                    health: status,
                    uptime: timeSinceLastRun,
                    lastExecution: stats?.lastRun || null,
                    checks: {
                        cronScheduleActive: true,
                        recentExecution: isHealthy,
                        errorRate: stats ? (stats.errors / (stats.activeEmployees || 1)) : 0,
                        performanceGood: stats ? stats.executionTime < 60000 : true // Under 1 minute
                    }
                }
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to perform health check');
        }
    }

    /**
     * Helper method to format duration
     */
    private formatDuration(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}
