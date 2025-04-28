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
        @Query() params: DashboardParamsDto
    ) {
        return this.dashboardService.getDashboardData(userId, params);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('task-summary')
    async getTaskSummary(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto
    ) {
        return this.dashboardService.getDashboardData(userId, params).then(data => data.taskSummary);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('time-tracking')
    async getTimeTracking(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto
    ) {
        return this.dashboardService.getDashboardData(userId, params).then(data => data.timeTracking);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('daily-tasks')
    async getDailyTasks(@GetAccount() userId: string) {
        return this.dashboardService.getDashboardData(userId, {}).then(data => data.dailyTasks);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('project-stats')
    async getProjectStats(
        @GetAccount() userId: string,
        @Query() params: DashboardParamsDto
    ) {
        return this.dashboardService.getDashboardData(userId, params).then(data => data.projectStats);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('my-tasks')
    async getMyTasks(@GetAccount() userId: string) {
        return this.dashboardService.getDashboardData(userId, {}).then(data => data.myTasks);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('recent-activity')
    async getRecentActivity(@GetAccount() userId: string) {
        return this.dashboardService.getDashboardData(userId, {}).then(data => data.recentActivities);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.TASK_SEARCH_AND_VIEW)
    @Get('messages')
    async getMessages(@GetAccount() userId: string) {
        return this.dashboardService.getDashboardData(userId, {}).then(data => data.messages);
    }
}