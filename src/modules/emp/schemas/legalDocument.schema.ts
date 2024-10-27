import { Prop } from "@nestjs/mongoose";

export class LegalDocument {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    validity: Date;

    @Prop({ required: true })
    file: string;
}