import { GetEmpDto } from 'src/modules/emp/dto/get-emp.dto';
import { TaskStatus } from '../enums/task-status.enum';

export class GetTaskDto {
    id: string;
    name: string;
    description: string;
    priority: number;
    emp?: GetEmpDto;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    due_date: Date;
    files?: string[];

    constructor(task: any) {
        this.id = task._id.toString();
        this.name = task.name;
        this.description = task.description;
        this.priority = task.priority;
        this.emp = new GetEmpDto(task.emp);
        this.status = task.status;
        this.createdAt = task.createdAt;
        this.updatedAt = task.updatedAt;
        this.due_date = task.due_date;
        this.files = task.files || [];
    }
}
