export class GetJobCategoryDto {

  id: string;
  name: string;

  description: string;

  required_education: string;

  required_experience: string;

  required_skills: string[];

  constructor(partial: any) {
    this.id = partial._id.toString();
    this.description = partial.description;
    this.name = partial.name;
    this.required_education = partial.required_education;
    this.required_skills = partial.required_skills;
    this.required_experience = partial.required_experience;
  }
}
