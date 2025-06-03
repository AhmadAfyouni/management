import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { DashboardService } from './dashboard.service';
import { DashboardParamsDto } from './dto/dashboard-params.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get()
    async getDashboard(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto,
        @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, params);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('task-summary')
    async getTaskSummary(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto,
        @GetDepartment() departmentId: string

    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, params).then(data => data.taskSummary);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('time-tracking')
    async getTimeTracking(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto,
        @GetDepartment() departmentId: string

    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, params).then(data => data.timeTracking);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('daily-tasks')
    async getDailyTasks(@GetAccount() userId: string, @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, {}).then(data => data.dailyTasks);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('project-stats')
    async getProjectStats(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto,
        @GetDepartment() departmentId: string

    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, params).then(data => data.projectStats);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('my-tasks')
    async getMyTasks(@GetAccount() userId: string, @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, {}).then(data => data.myTasks);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('recent-activity')
    async getRecentActivity(@GetAccount() userId: string, @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, {}).then(data => data.recentActivities);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('messages')
    async getMessages(@GetAccount() userId: string, @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getDashboardData(userId, departmentId, {}).then(data => data.messages);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('routine-tasks-overview')
    async getRoutineTasksOverview(
        @GetAccount() userId: string,
        @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getRoutineTasksOverview(userId, departmentId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('progress-analytics')
    async getProgressAnalytics(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto,
        @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getProgressAnalytics(userId, departmentId, params);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('workload-distribution')
    async getWorkloadDistribution(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto,
        @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getWorkloadDistribution(userId, departmentId, params);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('department-overview')
    async getDepartmentOverview(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto,
        @GetDepartment() departmentId: string
    ) {
        return this.dashboardService.getDepartmentOverview(userId, departmentId, params);
    }
}