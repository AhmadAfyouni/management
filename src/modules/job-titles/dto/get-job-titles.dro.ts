import { GetJobCategoryDto } from "src/modules/job-category/dtos/get-category.dto";
import { GetDepartmentDto } from "../../../modules/department/dto/get-department.dto";

export class GetJobTitlesDto {
  id: string;
  name: string;
  title: string;
  grade_level: string;
  description: string;
  responsibilities: string[];
  department?: GetDepartmentDto;
  category?: GetJobCategoryDto; 

  constructor(jobTitles: any) {
    this.id = jobTitles._id.toString();
    this.name = jobTitles.name;
    this.title = jobTitles.title;
    this.grade_level = jobTitles.grade_level;
    this.description = jobTitles.description;
    this.responsibilities = jobTitles.responsibilities;


    this.department = jobTitles.department_id 
      ? new GetDepartmentDto(jobTitles.department_id)
      : undefined;

      this.category = jobTitles.category
      ? new GetJobCategoryDto(jobTitles.category)
      : undefined;
  }
}
