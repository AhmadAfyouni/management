import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { JobTitles } from 'src/modules/job-titles/schema/job-ttiles.schema';

export type EmpDocument = Emp & Document;

@Schema()
export class Emp {
  @Prop({ required: true, })
  name: string;

  @Prop({ required: true })
  dob: Date;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false, default: () => new Date() })
  employment_date: Date;

  @Prop({ required: true })
  password: string;
  @Prop({ required: true, ref: JobTitles.name })
  jobTitle: Types.ObjectId

  @Prop({ required: true })
  address: string;

  @Prop({ type: Boolean, required: false, default: false })
  changed_password: boolean;
}

export const EmpSchema = SchemaFactory.createForClass(Emp);
