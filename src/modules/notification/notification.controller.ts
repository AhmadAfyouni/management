import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    HttpCode,
    BadRequestException
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RequiredPermissions, Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/config/role.enum';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { GetAccount, GetDepartment } from 'src/common/decorators/user-guard';
import { CreateNotificationDto } from './dtos/create';
import { UpdateNotificationDto } from './dtos/update';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_ADD)
    @Post('create')
    async createNotification(@Body() createNotificationDto: CreateNotificationDto, @GetAccount() userId) {
        createNotificationDto.empId = userId;
        return this.notificationService.create(createNotificationDto);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_SEARCH_AND_VIEW)
    @Get('get-all')
    async getAllNotifications() {
        return this.notificationService.findAll();
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_SEARCH_AND_VIEW)
    @Get('get-my-notifications')
    async getMyNotifications(@GetAccount() userId) {
        return this.notificationService.findByUser(userId);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_SEARCH_AND_VIEW)
    @Get('get-unread-count')
    async getUnreadCount(@GetAccount() userId) {
        const count = await this.notificationService.getUnreadCount(userId);
        return { count };
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_UPDATE)
    @Get('mark-all-read')
    async markAllAsRead(@GetAccount() userId) {
        await this.notificationService.markAllAsRead(userId);
        return { success: true, message: 'All notifications marked as read' };
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_SEARCH_AND_VIEW)
    @Get('notification/:id')
    async getNotificationById(@Param('id') id: string) {
        return this.notificationService.findOne(id);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_UPDATE)
    @Post('update/:id')
    async updateNotification(
        @Param('id') id: string,
        @Body() updateNotificationDto: UpdateNotificationDto,
    ) {
        return this.notificationService.update(id, updateNotificationDto);
    }

    @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_UPDATE)
    @Get('mark-read/:id')
    async markAsRead(@Param('id') id: string) {
        return this.notificationService.markAsRead(id);
    }

    @Roles(UserRole.PRIMARY_USER)
    @RequiredPermissions(PermissionsEnum.NOTIFICATION_DELETE)
    @Post('delete/:id')
    async deleteNotification(@Param('id') id: string) {
        await this.notificationService.remove(id);
        return { success: true, message: 'Notification deleted successfully' };
    }

    // @Roles(UserRole.PRIMARY_USER, UserRole.SECONDARY_USER)
    // @RequiredPermissions(PermissionsEnum.NOTIFICATION_SEARCH_AND_VIEW)
    // @Get('weekly-notifications')
    // async getWeeklyNotifications(@GetAccount() userId: string) {
    //     // Implement this method in your service
    //     return this.notificationService.getWeeklyNotifications(userId);
    // }

    // @Roles(UserRole.ADMIN)
    // @Get('get-all-system-notifications')
    // async getAllSystemNotifications() {
    //     // Implement this method in your service
    //     return this.notificationService.getAllSystemNotifications();
    // }

    // @Roles(UserRole.PRIMARY_USER)
    // @RequiredPermissions(PermissionsEnum.NOTIFICATION_ADD)
    // @Post('create-for-department')
    // async createNotificationForDepartment(
    //     @Body() createDto: CreateNotificationDto,
    //     @GetAccount() userId,
    //     @GetDepartment() departmentId
    // ) {
    //     createDto.userId = userId;
    //     createDto.departmentId = departmentId;
    //     return this.notificationService.createForDepartment(createDto);
    // }
}