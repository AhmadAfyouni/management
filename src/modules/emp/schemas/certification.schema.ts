import { Prop } from "@nestjs/mongoose";
import { Types } from "mongoose";

export class Certification {
    @Prop({ required: true })
    certificate_name: string;

    @Prop({ required: true })
    date: Date;

    @Prop()
    grade: string;

    @Prop()
    file: string;

    // Add fileId reference to the File model
    @Prop({ type: Types.ObjectId, ref: 'File' })
    fileId?: Types.ObjectId;
}
