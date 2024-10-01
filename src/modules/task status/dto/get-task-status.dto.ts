export class GetTaskStatusDto {
    id: string;
    name: string;
    description: string;
    constructor(status: any) {
        this.id = status._id.toString();
        this.name = status.name;
        this.description = status.description;
    }
}
