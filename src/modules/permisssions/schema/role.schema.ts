import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Permission } from './permission.schema';

export type RoleDocument = Role & Document;

@Schema()
export class Role {
    @Prop({ required: true })
    name: string;
    @Prop({ type: [Types.ObjectId], ref: Permission.name })
    permissions: Types.ObjectId[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
