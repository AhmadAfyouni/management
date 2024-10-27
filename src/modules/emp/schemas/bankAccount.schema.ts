import { Prop } from "@nestjs/mongoose";

export class BankAccount {
    @Prop({ required: true })
    bank_name: string;

    @Prop({ required: true })
    account_number: string;
}