import { Controller, Post } from "@nestjs/common";
import { Body, Get, Param, UseGuards } from "@nestjs/common/decorators";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateEmpDto } from "./dto/create-emp.dto";
import { UpdateEmpDto } from "./dto/update-emp.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { EmpService } from "./emp.service";


// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller("emp")
export class EmpController {

    constructor(private readonly empService: EmpService) { }

    @Get("get-all-emps")
    async getAllEmps() {
        return await this.empService.getAllEmp();
    }

    @Post("create")
    async createEmp(@Body() createEmpDto: CreateEmpDto) {
        return await this.empService.createEmp(createEmpDto);
    }

    @Post('change-password/:empId')
    async changePassword(
        @Param('empId') empId: string,
        @Body() updatePasswordDto: UpdatePasswordDto,
    ): Promise<{ message: string; }> {
        await this.empService.updatePassword(empId, updatePasswordDto);
        return { message: 'Password updated successfully' };
    }

    @Post("update/:id")
    async updateEmp(@Param("id") id: string, @Body() updatePasswordDto: UpdateEmpDto) {
        return this.empService.updateEmp(id, updatePasswordDto)
    }
}