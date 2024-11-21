import { PermissionsEnum } from "src/config/permissions.enum";
import { GetJobCategoryDto } from "src/modules/job-category/dtos/get-category.dto";
import { GetDepartmentDto } from "../../../modules/department/dto/get-department.dto";

export class GetJobTitlesDto {
  id: string;
  name: string;
  title: string;
  description: string;
  responsibilities: string[];
  department?: GetDepartmentDto;
  category?: GetJobCategoryDto;
  permissions: PermissionsEnum[];
  accessibleDepartments: string[];
  is_manager: boolean;
  constructor(jobTitles: any) {
    this.id = jobTitles._id.toString();
    this.name = jobTitles.name;
    this.title = jobTitles.title;
    this.description = jobTitles.description;
    this.responsibilities = jobTitles.responsibilities;
    this.permissions = jobTitles.permissions || [];
    this.accessibleDepartments = jobTitles.accessible_departments || [];
    this.is_manager = jobTitles.is_manager;
    this.department = jobTitles.department_id
    this.category = jobTitles.category
      ? new GetJobCategoryDto(jobTitles.category)
      : undefined;
  }
}
