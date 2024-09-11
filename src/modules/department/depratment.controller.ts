import { Body, Controller, Get, Post } from "@nestjs/common";
import { Param, UseGuards } from "@nestjs/common/decorators";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DepartmentService } from "./depratment.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { GetDepartmentDto } from "./dto/get-department.dto";


@UseGuards(JwtAuthGuard, RolesGuard)
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
    @Get("find/:id")
    async findById(@Param("id") id: string): Promise<GetDepartmentDto | null> {
        return await this.departmentService.findById(id);
    }

    @Get("getSubDepartment")
    async getSubDepartments(): Promise<GetDepartmentDto[]> {
        return await this.departmentService.findSubDepartments();
    }


    @Post("updateDepartment/:id")
    async updateDepartment(@Param('id') id: string,
        @Body() dept: Partial<CreateDepartmentDto>
    ): Promise<any> {
        return await this.departmentService.updateDept(id,dept);
    }
}