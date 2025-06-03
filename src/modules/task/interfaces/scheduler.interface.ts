export interface RoutineTaskStats {
    totalEmployees: number;
    activeEmployees: number;
    tasksGenerated: number;
    errors: number;
    executionTime: number;
    lastRun: Date;
}

export interface SchedulerHealthCheck {
    health: 'healthy' | 'unhealthy';
    uptime: number;
    lastExecution: Date | null;
    checks: {
        cronScheduleActive: boolean;
        recentExecution: boolean;
        errorRate: number;
        performanceGood: boolean;
    };
}

export interface SchedulerConfig {
    cronSchedule: string;
    timezone: string;
    features: {
        routineTaskGeneration: boolean;
        recurringTaskGeneration: boolean;
        duplicatePrevention: boolean;
        hierarchicalTasks: boolean;
        notificationIntegration: boolean;
    };
    limits: {
        maxTasksPerEmployee: number;
        maxSubTasksPerTask: number;
        maxExecutionTime: number;
    };
    supportedRecurringTypes: string[];
    supportedPriorities: string[];
}

export interface NextRunInfo {
    nextRun: Date;
    timeUntilNext: number;
    formattedTimeUntil: string;
    cronExpression: string;
    timezone: string;
}

export interface SchedulerStatusResponse {
    isHealthy: boolean;
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date;
    timeSinceLastRun: number;
    executionTime: number | null;
    tasksGenerated: number;
    totalEmployees: number;
    activeEmployees: number;
    errors: number;
    successRate: number;
}
