import { Controller, Post } from "@nestjs/common";
import { Body, Get, UseGuards } from "@nestjs/common/decorators";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateEmpDto } from "./dto/create-emp.dto";
import { EmpService } from "./emp.service";


// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller("emp")
export class EmpController {

    constructor(private readonly empService: EmpService) { }

    @Get("getAllEmps")
    async getAllEmps() {
        return await this.empService.getAllEmp();
    }

    @Post("create")
    async createEmp(@Body() createEmpDto: CreateEmpDto) {
        return await this.empService.createEmp(createEmpDto);
    }
    
}