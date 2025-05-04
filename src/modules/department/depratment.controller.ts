import { Body, Controller, Get, Post } from "@nestjs/common";
import { Param, Req, UseGuards } from "@nestjs/common/decorators";
import { Pagination } from "src/common/decorators/pagination.decorator";
import { RequiredPermissions, Roles } from "src/common/decorators/role.decorator";
import { GetAccessDepartment, GetAccount, GetDepartment } from "src/common/decorators/user-guard";
import { PaginatedResult, PaginationOptions } from "src/common/interfaces/pagination.interface";
import { PermissionsEnum } from "src/config/permissions.enum";
import { UserRole } from "src/config/role.enum";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DepartmentService } from "./depratment.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { GetDepartmentDto } from "./dto/get-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("department")
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) { }


    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.DEPARTMENT_ADD)
    @Post("create-department")
    async createDepartment(
        @Body() createDepartmentDto: CreateDepartmentDto,
        @GetAccount() empId: string
    ) {
        return await this.departmentService.createDeptWithFiles(
            createDepartmentDto,
            empId,
        );
    }


    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.DEPARTMENT_SEARCH_AND_VIEW)
    @Get("get-departments")
    async getDepartments(
        @Pagination() paginationOptions: PaginationOptions
    ): Promise<PaginatedResult<GetDepartmentDto>> {
        return await this.departmentService.getAllDepts(paginationOptions);
    }


    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.DEPARTMENT_SEARCH_AND_VIEW)
    @Get("find/:id")
    async findById(@Param("id") id: string): Promise<GetDepartmentDto | null> {
        return await this.departmentService.findById(id);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.DEPARTMENT_SEARCH_AND_VIEW)
    @Get("tree")
    async getDepartmentTree(@GetDepartment() departmentId, @GetAccessDepartment() departments): Promise<any> {
        return await this.departmentService.getDepartmentTree(departmentId, departments);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.DEPARTMENT_UPDATE)
    @Post("updateDepartment/:id")
    async updateDepartment(@Param('id') id: string,
        @Body() dept: UpdateDepartmentDto,
    ): Promise<any> {
        return await this.departmentService.updateDept(id, dept);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.DEPARTMENT_VIEW_SPECIFIC)
    @Get("view")
    async viewSpecificDepartments(@GetAccessDepartment() departments): Promise<GetDepartmentDto[]> {
        return await this.departmentService.viewAccessDepartment(departments);
    }

    @Get("get-level-one")
    async getMyLevelOne(@GetDepartment() departmentId: string): Promise<any> {
        return await this.departmentService.getMyLevelOne(departmentId);
    }
}