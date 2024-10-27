import { Prop } from "@nestjs/mongoose";


export class Incentive {
    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    amount: number;
}