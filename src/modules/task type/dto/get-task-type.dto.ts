export class GetTaskTypeDto {
    id: string;
    name: string;
    description: string;
    constructor(taskType: any) {    
            
        this.id = taskType._id.toString();
        this.name = taskType.name;
        this.description = taskType.description;
    }
}
