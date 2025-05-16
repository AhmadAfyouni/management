import { Prop } from "@nestjs/mongoose";
import { Types } from "mongoose";

export class LegalDocument {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    validity: Date;

    @Prop({ required: true })
    file: string;

    // Add fileId reference to the File model
    @Prop({ type: Types.ObjectId, ref: 'File' })
    fileId?: Types.ObjectId;
}