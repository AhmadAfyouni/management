import { IsMongoId,IsDate, IsEmail, IsPhoneNumber } from "class-validator";
import { Types } from "mongoose";

export class CreateEmpDto {
    name: string;
    @IsDate()
    dob: Date;
    @IsPhoneNumber()
    phone: string;
    @IsEmail()
    email: string;
    password:string;
    address: string;
    @IsMongoId()
    departmetn_id: Types.ObjectId;
    @IsMongoId()
    job_id: Types.ObjectId;
}