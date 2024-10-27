import { Prop } from "@nestjs/mongoose";

export class Certification {
    @Prop({ required: true })
    certificate_name: string;

    @Prop({ required: true })
    date: Date;

    @Prop()
    grade: string;

    @Prop()
    file: string;
}