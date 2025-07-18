import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Notification, NotificationDocument } from './schema/notification.schema';
import { CreateNotificationDto } from './dtos/create';
import { UpdateNotificationDto } from './dtos/update';
import { Department } from '../department/schema/department.schema';
import { Task } from '../task/schema/task.schema';
import { Transaction } from '../transaction/schema/transaction.schema';
import { TransactionStatus } from '../transaction/types/transaction.enum';

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private schedulerRegistry: SchedulerRegistry,
    ) { }

    async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
        // Add literal translation for title and message if not provided
        const translations = {
            'Task Created': 'تم إنشاء مهمة',
            'Task Updated': 'تم تحديث المهمة',
            'Task Status Updated': 'تم تحديث حالة المهمة',
            'Task Status Changed': 'تم تغيير حالة المهمة',
            'New Task Assigned': 'تم تعيين مهمة جديدة',
            'Task Reassigned': 'تم إعادة تعيين المهمة',
            'Department Updated': 'تم تحديث القسم',
            'Department Created': 'تم إنشاء قسم',
            'New Department Created': 'تم إنشاء قسم جديد',
            'Transaction Status Changed': 'تم تغيير حالة المعاملة',
            'Transaction Ready for Execution': 'المعاملة جاهزة للتنفيذ',
            'Transaction Awaiting Approval': 'المعاملة بانتظار الموافقة',
            'New Transaction Created': 'تم إنشاء معاملة جديدة',
        };
        const titleEn = createNotificationDto.titleEn || createNotificationDto.title || '';
        const titleAr = createNotificationDto.titleAr || translations[titleEn] || createNotificationDto.title || '';
        const messageEn = createNotificationDto.messageEn || createNotificationDto.message || '';
        let messageAr = createNotificationDto.messageAr;
        if (!messageAr && messageEn) {
            // Simple literal translation for common patterns
            messageAr = messageEn
                .replace('has been created successfully.', 'تم إنشاؤها بنجاح.')
                .replace('has been updated successfully.', 'تم تحديثها بنجاح.')
                .replace('assigned to you has been updated.', 'المعينة لك تم تحديثها.')
                .replace('You have been assigned a new task:', 'تم تعيين مهمة جديدة لك:')
                .replace('status has been changed to', 'تم تغيير حالتها إلى')
                .replace('status has changed from', 'تم تغيير حالتها من')
                .replace('has been reassigned from you.', 'تمت إعادة تعيينها منك.')
                .replace('has been updated.', 'تم تحديثها.')
                .replace('has been created and is pending approval.', 'تم إنشاؤها وهي بانتظار الموافقة.')
                .replace('is waiting for your department\'s approval.', 'بانتظار موافقة قسمك.')
                .replace('has been approved and is ready for execution by your department.', 'تمت الموافقة عليها وهي جاهزة للتنفيذ من قبل قسمك.')
                .replace('A new transaction has been created and is pending approval.', 'تم إنشاء معاملة جديدة وهي بانتظار الموافقة.')
                .replace('Your transaction status has changed from', 'تم تغيير حالة معاملتك من')
                .replace('to', 'إلى')
                .replace('You have updated a transaction status from', 'لقد قمت بتحديث حالة معاملة من')
                .replace('You have updated a transaction successfully.', 'لقد قمت بتحديث معاملة بنجاح.')
                .replace('Your transaction has been updated.', 'تم تحديث معاملتك.');
        }
        const notification = {
            ...createNotificationDto,
            notificationPushDateTime: new Date(),
            isRead: false,
            titleEn,
            titleAr,
            messageEn,
            messageAr,
        };
        const newNotification = new this.notificationModel(notification);
        const savedNotification = await newNotification.save();
        console.log(`Pushing notification: ${savedNotification.title}`);
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
            this.schedulerRegistry.deleteCronJob(`notification_${id} `);
        } catch (e) {
            // Job might have already executed or been deleted
        }
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationModel.countDocuments({ userId, isRead: false }).exec();
    }

    async notifyDepartmentCreated(department: Department, creatorId: string): Promise<void> {
        const notification: CreateNotificationDto = {
            title: 'New Department Created',
            message: `Department "${department.name}" has been created successfully.`,
            empId: creatorId,
        };

        await this.create(notification);
    }

    async notifyDepartmentUpdated(department: Department, updaterId: string): Promise<void> {
        const notification: CreateNotificationDto = {
            title: 'Department Updated',
            message: `Department "${department.name}" has been updated successfully.`,
            empId: updaterId,
        };

        await this.create(notification);
    }


    async notifyTaskCreated(task: Task, creatorId: string, assigneeId?: string): Promise<void> {
        const creatorNotification: CreateNotificationDto = {
            title: 'Task Created',
            message: `Task "${task.name}" has been created successfully.`,
            empId: creatorId,
        };

        await this.create(creatorNotification);

        if (assigneeId && assigneeId !== creatorId.toString()) {
            const assigneeNotification: CreateNotificationDto = {
                title: 'New Task Assigned',
                message: `You have been assigned a new task: "${task.name}".`,
                empId: assigneeId,
            };
            await this.create(assigneeNotification);
        }
    }

    async notifyTaskUpdated(task: Task, updaterId: string, oldAssigneeId?: string): Promise<void> {
        const updaterNotification: CreateNotificationDto = {
            title: 'Task Updated',
            message: `Task "${task.name}" has been updated successfully.`,
            empId: updaterId,
        };

        await this.create(updaterNotification);

        if (task.assignee && task.assignee.toString() !== updaterId) {
            const assigneeNotification: CreateNotificationDto = {
                title: 'Task Updated',
                message: `Task "${task.name}" assigned to you has been updated.`,
                empId: task.assignee.toString(),
            };

            await this.create(assigneeNotification);
        }

        if (oldAssigneeId && task.assignee && oldAssigneeId !== task.assignee.toString()) {
            const reassignNotification: CreateNotificationDto = {
                title: 'Task Reassigned',
                message: `Task "${task.name}" has been reassigned from you.`,
                empId: oldAssigneeId,
            };

            await this.create(reassignNotification);
        }
    }

    async notifyTaskStatusChanged(task: Task, updaterId: string): Promise<void> {
        const statusMap = {
            'PENDING': 'Pending',
            'ONGOING': 'Ongoing',
            'ON_TEST': 'On Test',
            'DONE': 'Done'
        };

        const readableStatus = statusMap[task.status] || task.status;

        const updaterNotification: CreateNotificationDto = {
            title: 'Task Status Updated',
            message: `Task "${task.name}" status has been changed to "${readableStatus}".`,
            empId: updaterId,
        };

        await this.create(updaterNotification);

        if (task.assignee && task.assignee.toString() !== updaterId) {
            const assigneeNotification: CreateNotificationDto = {
                title: 'Task Status Changed',
                message: `Your task "${task.name}" status has been updated to "${readableStatus}".`,
                empId: task.assignee.toString(),
            };

            await this.create(assigneeNotification);
        }
    }


    async notifyTransactionCreated(transaction: Transaction, creatorId: string): Promise<void> {
        const notification: CreateNotificationDto = {
            title: 'New Transaction Created',
            message: `A new transaction has been created and is pending approval.`,
            empId: creatorId,
        };

        await this.create(notification);

        if (transaction.departments_approval_track && transaction.departments_approval_track.length > 0) {
            const firstDept = transaction.departments_approval_track[0];
            if (firstDept.employee) {
                const deptNotification: CreateNotificationDto = {
                    title: 'Transaction Awaiting Approval',
                    message: `A new transaction is waiting for your department's approval.`,
                    empId: firstDept.employee.toString(),
                };

                await this.create(deptNotification);
            }
        }
    }

    async notifyTransactionStatusChanged(
        transaction: Transaction,
        updaterId: string,
        oldStatus: TransactionStatus
    ): Promise<void> {
        const statusMap = {
            'NOT_APPROVED': 'Not Approved',
            'APPROVED': 'Approved',
            'REJECTED': 'Rejected',
            'IN_PROGRESS': 'In Progress',
            'COMPLETED': 'Completed',
            'ARCHIVED': 'Archived'
        };

        const oldStatusReadable = statusMap[oldStatus] || oldStatus;
        const newStatusReadable = statusMap[transaction.status] || transaction.status;

        const ownerNotification: CreateNotificationDto = {
            title: 'Transaction Status Changed',
            message: `Your transaction status has changed from "${oldStatusReadable}" to "${newStatusReadable}".`,
            empId: transaction.transaction_owner.toString(),
        };

        await this.create(ownerNotification);

        if (updaterId !== transaction.transaction_owner.toString()) {
            const updaterNotification: CreateNotificationDto = {
                title: 'Transaction Updated',
                message: `You have updated a transaction status from "${oldStatusReadable}" to "${newStatusReadable}".`,
                empId: updaterId,
            };

            await this.create(updaterNotification);
        }

        if (
            transaction.status === TransactionStatus.FULLY_APPROVED &&
            transaction.departments_execution &&
            transaction.departments_execution.length > 0
        ) {
            for (const dept of transaction.departments_execution) {
                if (dept.employee) {
                    const execNotification: CreateNotificationDto = {
                        title: 'Transaction Ready for Execution',
                        message: `A transaction has been approved and is ready for execution by your department.`,
                        empId: dept.employee.toString(),
                    };

                    await this.create(execNotification);
                }
            }
        }
    }

    async notifyTransactionUpdated(transaction: Transaction, updaterId: string): Promise<void> {
        const updaterNotification: CreateNotificationDto = {
            title: 'Transaction Updated',
            message: `You have updated a transaction successfully.`,
            empId: updaterId,
        };

        await this.create(updaterNotification);

        if (updaterId !== transaction.transaction_owner.toString()) {
            const ownerNotification: CreateNotificationDto = {
                title: 'Transaction Updated',
                message: `Your transaction has been updated.`,
                empId: transaction.transaction_owner.toString(),
            };

            await this.create(ownerNotification);
        }
    }
}