import { DepartmentDocument } from '../schema/department.schema';
import { Types } from 'mongoose';

export class GetDepartmentDto {
    id: string;
    name: string;
    goal: string;
    category: string;
    mainTasks: string;
    parent_department: any;
    numericOwners: Array<{ category: string; count: number }>;
    supportingFiles: any[];
    requiredReports: any[];
    developmentPrograms: any[];
    createdAt?: Date;
    updatedAt?: Date;

    constructor(department: any) {
        this.id = department._id.toString();
        this.name = department.name;
        this.goal = department.goal;
        this.category = department.category;
        this.mainTasks = department.mainTasks;

        // Handle parent department
        if (department.parent_department_id) {
            if (typeof department.parent_department_id === 'object' && department.parent_department_id !== null) {
                this.parent_department = {
                    id: department.parent_department_id._id.toString(),
                    name: department.parent_department_id.name
                };
            } else {
                this.parent_department = { id: department.parent_department_id.toString() };
            }
        } else {
            this.parent_department = null;
        }

        // Handle supporting files with deep population
        this.supportingFiles = department.supportingFiles;

        // Handle required reports with deep population
        this.requiredReports = department.requiredReports

        // Handle development programs with deep population
        this.developmentPrograms = department.developmentPrograms

        this.numericOwners = department.numericOwners || [];
        this.createdAt = department.createdAt;
        this.updatedAt = department.updatedAt;
    }
}