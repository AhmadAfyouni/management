import { GetEmpDto } from 'src/modules/emp/dto/get-emp.dto';
import { TASK_STATUS } from '../enums/task-status.enum';
import { TaskDocument } from '../schema/task.schema';

export class GetTaskDto {
    id: string;
    name: string;
    description: string;
    priority: number;
    emp?: GetEmpDto | null;
    status: TASK_STATUS;
    createdAt: Date;
    updatedAt: Date;
    due_date: Date;
    files?: string[];
    is_over_due: boolean;
    section: any;
    assignee: any;
    totalTimeSpent: any;
    startTime: any;
    timeLogs: any;
    subTasks: any;
    parent_task: any;
    department: any;
    over_all_time: any;
    constructor(task: any) {
        this.id = task._id.toString();
        this.name = task.name;
        this.description = task.description;
        this.priority = task.priority;
        this.emp = task.emp ? new GetEmpDto(task.emp) : null;
        this.status = task.status;
        this.createdAt = task.createdAt;
        this.updatedAt = task.updatedAt;
        this.due_date = task.due_date;
        this.files = task.files || [];
        this.is_over_due = task.due_date < new Date() && task.status !== TASK_STATUS.DONE;
        this.section = task.section_id;
        this.assignee = task.assignee;
        this.totalTimeSpent = task.totalTimeSpent;
        this.startTime = task.startTime;
        this.timeLogs = task.timeLogs;
        this.subTasks = task.subtasks;
        this.parent_task = task.parent_task;
        this.department = task.department_id || undefined
        this.over_all_time = task.over_all_time || undefined;
    }
}
