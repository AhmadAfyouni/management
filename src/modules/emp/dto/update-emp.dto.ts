import { PartialType } from "@nestjs/mapped-types";
import { CreateEmpDto } from "./create-emp.dto";

export class UpdateEmpDto extends PartialType(CreateEmpDto) { }