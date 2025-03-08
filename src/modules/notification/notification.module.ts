import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './schema/notification.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Notification.name, schema: NotificationSchema }
        ]),
        ScheduleModule.forRoot(),
    ],
    controllers: [NotificationController],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }