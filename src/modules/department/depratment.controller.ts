import { Body, Controller, Get, Post } from "@nestjs/common";
import { UseGuards } from "@nestjs/common/decorators";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DepartmentService } from "./depratment.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { GetDepartmentDto } from "./dto/get-department.dto";
import { UserRole } from "src/config/role.enum";


@UseGuards(JwtAuthGuard,RolesGuard)
@Controller("department")
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) { }

    @Post("createDepartment")
    async createDepartment(@Body() createDepartment: CreateDepartmentDto) {
        return await this.departmentService.createDept(createDepartment);
    }

    @Get("getDepartments")
    async getDepartments(): Promise<GetDepartmentDto[]> {
        return await this.departmentService.getAllDepts();
    }

}