import { Controller } from '@nestjs/common';
import { EmpService } from './emp.service';
import { Emp } from './schema/emp.schema';
import { TypedBody, TypedRoute } from '@nestia/core';


@Controller("emp")
export class EmpController {
    constructor(
        private readonly userService: EmpService) { }
    @TypedRoute.Get("get-all-emp")
    async getAllEmo() {
        return this.userService.getAllEmp();
    }

    @TypedRoute.Post("create")
    async createEmp(@TypedBody() employee: Emp) {
        
        return this.userService.createEmp(employee);
    }
}