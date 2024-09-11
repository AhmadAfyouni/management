import { Controller, Post } from "@nestjs/common";
import { Get, UseGuards } from "@nestjs/common/decorators";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { EmpService } from "./emp.service";


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("emp")
export class EmpController {

    constructor(private readonly empService: EmpService) { }

    @Get("getAllEmps")
    async getAllEmps() {
        return await this.empService.getAllEmp();
    }

}