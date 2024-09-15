export class GetTaskTypeDto {
    name: string;
    description: string;
    constructor(taskType: any) {
        this.name = taskType.name;
        this.description = taskType.description;
    }
}
