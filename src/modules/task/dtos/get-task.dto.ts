import { GetEmpDto } from 'src/modules/emp/dto/get-emp.dto';
import { TASK_STATUS } from '../enums/task-status.enum';
import { PRIORITY_TYPE } from '../enums/priority.enum';
import { take } from 'rxjs';

export class GetTaskDto {
    id: string;
    name: string;
    description: string;
    priority: PRIORITY_TYPE;
    emp?: GetEmpDto | null;
    assignee?: GetEmpDto | null;
    status: TASK_STATUS;
    createdAt: Date;
    updatedAt: Date;
    due_date: Date;
    start_date: Date;
    actual_end_date?: Date;
    expected_end_date?: Date;

    // Time tracking fields
    estimated_hours?: number;
    actual_hours?: number;
    totalTimeSpent: number;
    startTime?: Date;
    timeLogs: { start: Date; end?: Date }[];

    // File management
    files: string[];

    // Status and progress
    is_over_due: boolean;
    progress: number;
    progressCalculationMethod: string;
    hasLoggedHours: boolean;
    isActive: boolean;

    // Recurring task fields
    isRecurring: boolean;
    recurringType?: string;
    intervalInDays?: number;
    recurringEndDate?: Date;

    // Routine task fields
    isRoutineTask: boolean;
    routineTaskId?: string;

    // Relationships
    parent_task?: string;
    sub_tasks: string[];
    dependencies: string[];

    // Organization
    section: any;
    department: any;
    project?: any;
    manager_section_id?: any;
    // Board customization
    boardPosition?: string;
    boardOrder?: number;

    // Legacy fields
    over_all_time?: string;
    rate?: number;
    requiresRating: boolean;
    comment?: string;
    end_date?: Date;

    // Nested subtasks for hierarchical display
    subtasks?: GetTaskDto[];

    constructor(task: any) {
        try {
            // Required fields with safe fallbacks
            this.id = this.safeGetId(task);
            this.name = this.safeGetString(task?.name, 'Untitled Task');
            this.description = this.safeGetString(task?.description, '');
            this.priority = task?.priority || PRIORITY_TYPE.MEDIUM;
            this.status = task?.status || TASK_STATUS.PENDING;

            // Dates
            this.createdAt = this.safeGetDate(task?.createdAt) as any;
            this.updatedAt = this.safeGetDate(task?.updatedAt) as any;
            this.due_date = this.safeGetDate(task?.due_date) as any;
            this.start_date = this.safeGetDate(task?.start_date) as any;
            this.actual_end_date = this.safeGetDate(task?.actual_end_date);
            this.expected_end_date = this.safeGetDate(task?.expected_end_date);
            this.end_date = this.safeGetDate(task?.end_date);

            // Employee references - safely create DTOs
            this.emp = this.safeCreateEmpDto(task?.emp);
            this.assignee = this.safeCreateEmpDto(task?.assignee);

            // Time tracking
            this.estimated_hours = this.safeGetNumber(task?.estimated_hours, 0);
            this.actual_hours = this.safeGetNumber(task?.actual_hours, 0);
            this.totalTimeSpent = this.safeGetNumber(task?.totalTimeSpent, 0) as any;
            this.startTime = this.safeGetDate(task?.startTime);
            this.timeLogs = this.safeGetArray(task?.timeLogs);

            // Files
            this.files = this.safeGetStringArray(task?.files);

            // Status calculations
            this.is_over_due = this.calculateOverdue(this.due_date, this.status);
            this.progress = this.safeGetNumber(task?.progress, 0) as any;
            this.progressCalculationMethod = this.safeGetString(task?.progressCalculationMethod, 'time_based');
            this.hasLoggedHours = Boolean(task?.hasLoggedHours);
            this.isActive = task?.isActive !== undefined ? Boolean(task.isActive) : true;

            // Recurring fields
            this.isRecurring = Boolean(task?.isRecurring);
            this.recurringType = task?.recurringType;
            this.intervalInDays = this.safeGetNumber(task?.intervalInDays);
            this.recurringEndDate = this.safeGetDate(task?.recurringEndDate);

            // Routine task fields
            this.isRoutineTask = Boolean(task?.isRoutineTask);
            this.routineTaskId = task?.routineTaskId;

            // Relationships - safely convert to strings
            this.parent_task = this.safeGetObjectIdString(task?.parent_task);
            this.sub_tasks = this.safeGetObjectIdStringArray(task?.sub_tasks);
            this.dependencies = this.safeGetObjectIdStringArray(task?.dependencies);

            // Organization fields
            this.section = task?.section_id || null;
            this.department = task?.department_id || null;
            this.project = task?.project_id || null;
            this.manager_section_id = task?.manager_section_id || null;
            // Board customization
            this.boardPosition = task?.boardPosition;
            this.boardOrder = this.safeGetNumber(task?.boardOrder);

            // Legacy fields
            this.over_all_time = task?.over_all_time;
            this.rate = task?.rate || 0;
            this.requiresRating = task.requiresRating
            this.comment = task?.comment;

            // Handle nested subtasks if present
            this.subtasks = this.safeCreateSubtaskDtos(task?.subtasks);

        } catch (error) {
            console.error('Error in GetTaskDto constructor:', error);
            // Set safe defaults if constructor fails
            this.setDefaults(task);
        }
    }

    /**
     * Safely get ID from task object
     */
    private safeGetId(task: any): string {
        if (!task) return '';

        if (task._id) {
            return typeof task._id === 'string' ? task._id : task._id.toString();
        }

        if (task.id) {
            return typeof task.id === 'string' ? task.id : task.id.toString();
        }

        return '';
    }

    /**
     * Safely get string value with fallback
     */
    private safeGetString(value: any, fallback: string = ''): string {
        if (value === null || value === undefined) return fallback;
        return typeof value === 'string' ? value : String(value);
    }

    /**
     * Safely get number value with optional fallback
     */
    private safeGetNumber(value: any, fallback?: number): number | undefined {
        if (value === null || value === undefined) return fallback;
        const num = Number(value);
        return isNaN(num) ? fallback : num;
    }

    /**
     * Safely get date value
     */
    private safeGetDate(value: any): Date | undefined {
        if (!value) return undefined;

        try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? undefined : date;
        } catch {
            return undefined;
        }
    }

    /**
     * Safely get array value
     */
    private safeGetArray(value: any): any[] {
        return Array.isArray(value) ? value : [];
    }

    /**
     * Safely get string array
     */
    private safeGetStringArray(value: any): string[] {
        if (!Array.isArray(value)) return [];
        return value.map(item => this.safeGetString(item)).filter(str => str !== '');
    }

    /**
     * Safely convert value to ObjectId string
     */
    private safeGetObjectIdString(value: any): string | undefined {
        if (!value) return undefined;

        try {
            if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
                return value;
            }

            if (value._id) {
                const id = typeof value._id === 'string' ? value._id : value._id.toString();
                return /^[0-9a-fA-F]{24}$/.test(id) ? id : undefined;
            }

            const stringValue = value.toString();
            return /^[0-9a-fA-F]{24}$/.test(stringValue) ? stringValue : undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Safely convert array to ObjectId string array
     */
    private safeGetObjectIdStringArray(value: any): string[] {
        if (!Array.isArray(value)) return [];

        return value
            .map(item => this.safeGetObjectIdString(item))
            .filter((id): id is string => id !== undefined);
    }

    /**
     * Safely create employee DTO
     */
    private safeCreateEmpDto(empData: any): GetEmpDto | null {
        if (!empData) return null;

        // If it's just a string ID, return null (not populated)
        if (typeof empData === 'string') return null;

        // If it's an object with _id, try to create DTO
        if (typeof empData === 'object' && empData._id) {
            try {
                return new GetEmpDto(empData);
            } catch (error) {
                console.warn('Failed to create GetEmpDto:', error);
                return null;
            }
        }

        return null;
    }

    /**
     * Safely create subtask DTOs
     */
    private safeCreateSubtaskDtos(subtasks: any): GetTaskDto[] | undefined {
        if (!Array.isArray(subtasks) || subtasks.length === 0) {
            return undefined;
        }

        return subtasks
            .map(subtask => {
                try {
                    return new GetTaskDto(subtask);
                } catch (error) {
                    console.warn('Failed to create subtask DTO:', error);
                    return null;
                }
            })
            .filter((dto): dto is GetTaskDto => dto !== null);
    }

    /**
     * Calculate if task is overdue
     */
    private calculateOverdue(dueDate: Date | undefined, status: TASK_STATUS): boolean {
        if (!dueDate || status === TASK_STATUS.DONE) return false;

        try {
            return new Date(dueDate) < new Date();
        } catch {
            return false;
        }
    }

    /**
     * Set safe defaults if constructor fails
     */
    private setDefaults(task: any): void {
        this.id = this.safeGetId(task);
        this.name = 'Untitled Task';
        this.description = '';
        this.priority = PRIORITY_TYPE.MEDIUM;
        this.emp = null;
        this.assignee = null;
        this.status = TASK_STATUS.PENDING;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.due_date = new Date();
        this.start_date = new Date();
        this.estimated_hours = 0;
        this.actual_hours = 0;
        this.totalTimeSpent = 0;
        this.timeLogs = [];
        this.files = [];
        this.is_over_due = false;
        this.progress = 0;
        this.progressCalculationMethod = 'time_based';
        this.hasLoggedHours = false;
        this.isActive = true;
        this.isRecurring = false;
        this.isRoutineTask = false;
        this.sub_tasks = [];
        this.dependencies = [];
        this.section = null;
        this.manager_section_id = null;
        this.department = null;
        this.project = null;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get formatted time spent
     */
    getFormattedTimeSpent(): string {
        if (this.totalTimeSpent === 0) return '0h';

        const hours = Math.floor(this.totalTimeSpent / 3600);
        const minutes = Math.floor((this.totalTimeSpent % 3600) / 60);

        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${minutes}m`;
    }

    /**
     * Get progress percentage as string
     */
    getProgressPercentage(): string {
        return `${Math.round(this.progress)}%`;
    }

    /**
     * Check if task is currently running
     */
    isRunning(): boolean {
        if (!this.timeLogs || this.timeLogs.length === 0) return false;
        const lastLog = this.timeLogs[this.timeLogs.length - 1];
        return !lastLog.end;
    }

    /**
     * Get task priority display
     */
    getPriorityDisplay(): string {
        switch (this.priority) {
            case PRIORITY_TYPE.HIGH:
                return '🔴 High';
            case PRIORITY_TYPE.MEDIUM:
                return '🟡 Medium';
            case PRIORITY_TYPE.LOW:
                return '🟢 Low';
            default:
                return '⚪ Unknown';
        }
    }

    /**
     * Get task status display
     */
    getStatusDisplay(): string {
        switch (this.status) {
            case TASK_STATUS.PENDING:
                return '⏳ Pending';
            case TASK_STATUS.ONGOING:
                return '🔄 In Progress';
            case TASK_STATUS.ON_TEST:
                return '🔍 Testing';
            case TASK_STATUS.DONE:
                return '✅ Completed';
            default:
                return '❓ Unknown';
        }
    }

    /**
     * Get days until due date
     */
    getDaysUntilDue(): number {
        if (!this.due_date) return 0;

        try {
            const now = new Date();
            const due = new Date(this.due_date);
            const diffTime = due.getTime() - now.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch {
            return 0;
        }
    }

    /**
     * Get task type display
     */
    getTaskTypeDisplay(): string {
        if (this.isRoutineTask) {
            return '🔄 Routine';
        }
        if (this.isRecurring) {
            return '🔁 Recurring';
        }
        if (this.parent_task) {
            return '🔗 Subtask';
        }
        if (this.sub_tasks.length > 0) {
            return '📁 Parent Task';
        }
        return '📋 Regular';
    }

    /**
     * Check if task needs attention (overdue or high priority)
     */
    needsAttention(): boolean {
        return this.is_over_due ||
            (this.priority === PRIORITY_TYPE.HIGH && this.status !== TASK_STATUS.DONE) ||
            (this.getDaysUntilDue() <= 1 && this.status !== TASK_STATUS.DONE);
    }

    /**
     * Get completion ratio for estimated vs actual hours
     */
    getTimeEfficiency(): number | null {
        if (!this.estimated_hours || this.estimated_hours === 0 || !this.actual_hours) {
            return null;
        }
        return Math.round((this.estimated_hours / this.actual_hours) * 100);
    }
}