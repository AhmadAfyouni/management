export class GetTaskStatusDto {
    name: string;
    description: string;
    constructor(status: any) {
        this.name = status.name;
        this.description = status.description;
    }

}
