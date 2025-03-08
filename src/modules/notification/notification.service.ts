import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Notification, NotificationDocument } from './schema/notification.schema';
import { CreateNotificationDto } from './dtos/create';
import { UpdateNotificationDto } from './dtos/update';

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private schedulerRegistry: SchedulerRegistry,
    ) { }

    async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
        const notification = {
            ...createNotificationDto,
            notificationPushDateTime: new Date(),
            isRead: false
        };
        const newNotification = new this.notificationModel(notification);
        const savedNotification = await newNotification.save();

        // const notificationDate = new Date(createNotificationDto.notificationPushDateTime);
        // if (notificationDate > new Date()) {
        //     const job = new CronJob(notificationDate, () => {
        //         console.log(`Pushing notification: ${savedNotification.title}`);
        //     });

        //     this.schedulerRegistry.addCronJob(`notification_${savedNotification.id}`, job);
        //     job.start();
        // }

        return savedNotification;
    }

    async findAll(): Promise<Notification[]> {
        const notifications = await this.notificationModel.find({}).sort({ notificationPushDateTime: -1 }).lean().exec();
        return notifications;
    }

    async findOne(id: string): Promise<Notification> {
        const notification = await this.notificationModel.findById(id).lean().exec();
        if (!notification) {
            throw new NotFoundException(`Notification with ID "${id}" not found`);
        }
        return notification;
    }

    async findByUser(empId: string): Promise<Notification[]> {
        return await this.notificationModel.find({ empId }).sort({ notificationPushDateTime: -1 }).exec();
    }

    async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
        const updatedNotification = await this.notificationModel
            .findByIdAndUpdate(id, updateNotificationDto, { new: true })
            .exec();

        if (!updatedNotification) {
            throw new NotFoundException(`Notification with ID "${id}" not found`);
        }

        return updatedNotification;
    }

    async markAsRead(id: string): Promise<Notification> {
        return this.update(id, { isRead: true });
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationModel.updateMany(
            { userId, isRead: false },
            { isRead: true }
        ).exec();
    }

    async remove(id: string): Promise<void> {
        const notification = await this.findOne(id);
        await this.notificationModel.findByIdAndDelete(id).exec();

        try {
            this.schedulerRegistry.deleteCronJob(`notification_${id}`);
        } catch (e) {
            // Job might have already executed or been deleted
        }
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationModel.countDocuments({ userId, isRead: false }).exec();
    }
}
