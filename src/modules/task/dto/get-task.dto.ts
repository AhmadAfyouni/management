import { GetEmpDto } from 'src/modules/emp/dto/get-emp.dto';
import { GetTaskStatusDto } from 'src/modules/task status/dto/get-task-status.dto';
import { GetTaskTypeDto } from 'src/modules/task type/dto/get-task-type.dto';

export class GetTaskDto {
    name: string;
    description: string;
    task_type: GetTaskTypeDto;
    priority: number;
    emp: GetEmpDto;
    status: GetTaskStatusDto;
    createdAt: Date;
    updatedAt: Date;
    due_date: Date;
    files?: string[];

    constructor(task: any) {
        this.name = task.name;
        this.description = task.description;
        this.task_type = new GetTaskTypeDto(task.task_type);
        this.priority = task.priority;
        this.emp = new GetEmpDto(task.emp);
        this.status = new GetTaskStatusDto(task.status);
        this.createdAt = task.createdAt;
        this.updatedAt = task.updatedAt;
        this.due_date = task.due_date;
        this.files = task.files || [];
    }
}
