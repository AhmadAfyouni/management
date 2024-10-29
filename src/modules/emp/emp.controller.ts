import { Controller, Post } from "@nestjs/common";
import { Body, Get, Param, UseGuards } from "@nestjs/common/decorators";
import { RequiredPermissions, Roles } from "src/common/decorators/role.decorator";
import { PermissionsEnum } from "src/config/permissions.enum";
import { UserRole } from "src/config/role.enum";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateEmpDto } from "./dto/create-emp.dto";
import { UpdateEmpDto } from "./dto/update-emp.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { EmpService } from "./emp.service";


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("emp")
export class EmpController {

    constructor(private readonly empService: EmpService) { }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.EMP_VIEW_SPECIFIC)
    @Get("get-emp-by-department/:depId")
    async getEmpByDepartment(@Param("depId") depId: string) {
        return await this.empService.getEmpByDepartment(depId);
    }
    @Roles(UserRole.ADMIN)
    @Get("get-all-emps")
    async getAllEmps() {
        return await this.empService.getAllEmp();
    }
    
    @Roles(UserRole.ADMIN)
    @Post("create")
    async createEmp(@Body() createEmpDto: CreateEmpDto) {
        return await this.empService.createEmp(createEmpDto);
    }

    @Roles(UserRole.ADMIN)
    @Post("update/:id")
    async updateEmp(@Param("id") id: string, @Body() updatePasswordDto: UpdateEmpDto) {
        return this.empService.updateEmp(id, updatePasswordDto)
    }
}