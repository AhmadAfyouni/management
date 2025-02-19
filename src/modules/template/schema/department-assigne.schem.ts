import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { Emp } from 'src/modules/emp/schemas/emp.schema';
@Schema({ _id: false })
export class DepartmentAssignment {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: Department.name, required: true })
    department: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: Emp.name, required: false })
    employee?: Types.ObjectId;
}

export const DepartmentAssignmentSchema = SchemaFactory.createForClass(DepartmentAssignment);
