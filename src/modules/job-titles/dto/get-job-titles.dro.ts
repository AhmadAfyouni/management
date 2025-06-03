import { PermissionsEnum } from "src/config/permissions.enum";
import { GetJobCategoryDto } from "src/modules/job-category/dtos/get-category.dto";
import { GetDepartmentDto } from "../../../modules/department/dto/get-department.dto";
import { GetRoutineTaskDto } from "./routine-task.dto";

export class GetJobTitlesDto {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  department?: GetDepartmentDto;
  category?: GetJobCategoryDto;
  permissions: PermissionsEnum[];
  accessibleDepartments: string[];
  accessibleJobTitles: string[];
  accessibleEmps: string[];
  is_manager: boolean;
  routineTasks: GetRoutineTaskDto[];
  hasRoutineTasks: boolean;
  autoGenerateRoutineTasks: boolean;

  constructor(jobTitles: any) {
    this.id = jobTitles._id.toString();
    this.title = jobTitles.title;
    this.description = jobTitles.description;
    this.responsibilities = jobTitles.responsibilities;
    this.permissions = jobTitles.permissions || [];
    this.accessibleDepartments = jobTitles.accessibleDepartments || [];
    this.accessibleJobTitles = jobTitles.accessibleJobTitles || [];
    this.accessibleEmps = jobTitles.accessibleEmps || [];
    this.is_manager = jobTitles.is_manager || false;
    this.hasRoutineTasks = jobTitles.hasRoutineTasks || false;
    this.autoGenerateRoutineTasks = jobTitles.autoGenerateRoutineTasks !== undefined ? jobTitles.autoGenerateRoutineTasks : true;
    this.routineTasks = (jobTitles.routineTasks || []).map((task: any) => new GetRoutineTaskDto(task));

    this.department = jobTitles.department_id;
    this.category = jobTitles.category
      ? new GetJobCategoryDto(jobTitles.category)
      : undefined;
  }
}
