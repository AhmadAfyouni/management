import { PartialType } from "@nestjs/mapped-types";
import { CreateJobCategoryDto } from "./create-category.dto";

export class UpdateCategoryDto extends PartialType(CreateJobCategoryDto) { }