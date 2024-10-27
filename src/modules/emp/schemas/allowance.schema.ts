import { Prop } from "@nestjs/mongoose";

export class Allowance {
    @Prop({ required: true })
    allowance_type: string;

    @Prop({ required: true })
    amount: number;
}