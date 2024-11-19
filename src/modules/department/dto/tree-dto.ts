export class TreeDTO {
    id: string;
    name: string;
    parentId: string | null;

    constructor(dept: any) {
        this.id = dept._id.toString();
        this.name = dept.name;
        this.parentId = dept.parent_department_id;
    }
}