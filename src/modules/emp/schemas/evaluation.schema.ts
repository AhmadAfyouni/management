import { Prop } from "@nestjs/mongoose";

export class Evaluation {
    @Prop({ required: true })
    evaluation_type: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    plan: string;
}
