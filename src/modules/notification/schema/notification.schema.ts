import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Emp } from 'src/modules/emp/schemas/emp.schema';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ required: true, type: Date })
    notificationPushDateTime: Date;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ type: String, ref: Emp.name, required: true })
    empId: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

