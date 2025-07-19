import { GetEmpDto } from 'src/modules/emp/dto/get-emp.dto';
import { TASK_STATUS } from '../enums/task-status.enum';
import { PRIORITY_TYPE } from '../enums/priority.enum';
import { TaskDocument } from '../schema/task.schema';

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

    // Board customization
    boardPosition?: string;
    boardOrder?: number;

    // Legacy fields
    over_all_time?: string;
    rate?: number;
    end_date?: Date;

    // Nested subtasks for hierarchical display
    subtasks?: GetTaskDto[];

    constructor(task: any) {
        this.id = task._id.toString();
        this.name = task.name;
        this.description = task.description;
        this.priority = task.priority || PRIORITY_TYPE.MEDIUM;

        // إصلاح مشكلة emp و assignee
        this.emp = (task.emp && task.emp._id) ? new GetEmpDto(task.emp) : null;
        this.assignee = (task.assignee && task.assignee._id) ? new GetEmpDto(task.assignee) : null;

        this.status = task.status;
        this.createdAt = task.createdAt;
        this.updatedAt = task.updatedAt;
        this.due_date = task.due_date;
        this.start_date = task.start_date;
        this.actual_end_date = task.actual_end_date;
        this.expected_end_date = task.expected_end_date;

        // Time tracking
        this.estimated_hours = task.estimated_hours || 0;
        this.actual_hours = task.actual_hours || 0;
        this.totalTimeSpent = task.totalTimeSpent || 0;
        this.startTime = task.startTime;
        this.timeLogs = task.timeLogs || [];

        // Files
        this.files = task.files || [];

        // Status calculations
        this.is_over_due = task.due_date < new Date() && task.status !== TASK_STATUS.DONE;
        this.progress = task.progress || 0;
        this.progressCalculationMethod = task.progressCalculationMethod || 'time_based';
        this.hasLoggedHours = task.hasLoggedHours || false;
        this.isActive = task.isActive !== undefined ? task.isActive : true;

        // Recurring fields
        this.isRecurring = task.isRecurring || false;
        this.recurringType = task.recurringType;
        this.intervalInDays = task.intervalInDays;
        this.recurringEndDate = task.recurringEndDate;

        // Routine task fields
        this.isRoutineTask = task.isRoutineTask || false;
        this.routineTaskId = task.routineTaskId;

        // Relationships
        this.parent_task = task.parent_task?.toString() || task.parent_task;
        this.sub_tasks = task.sub_tasks || [];

        // Organization
        const getId = (val: any) => {
            if (!val) return undefined;
            if (typeof val === 'string') return val;
            if (val._id) return val._id.toString();
            return val.toString();
        };
        this.section = getId(task.section_id);
        this.department = getId(task.department_id);
        this.project = getId(task.project_id);

        // Legacy fields
        this.over_all_time = task.over_all_time;
        this.rate = task.rate;
        this.end_date = task.end_date;

        // Handle nested subtasks if present
        if (task.subtasks && Array.isArray(task.subtasks)) {
            this.subtasks = task.subtasks.map((subtask: any) => new GetTaskDto(subtask));
        }
    }

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
        const now = new Date();
        const due = new Date(this.due_date);
        const diffTime = due.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
