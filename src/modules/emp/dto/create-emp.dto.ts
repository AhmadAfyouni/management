import { IsMongoId, IsDate, IsEmail, IsPhoneNumber, IsString, IsNotEmpty } from "class-validator";
import { Types } from "mongoose";

export class CreateEmpDto {
    @IsString()
    @IsNotEmpty()
    name: string;
    @IsDate()
    dob: Date;
    @IsPhoneNumber()
    phone: string;
    @IsEmail()
    email: string;
    password: string;
    @IsString()
    @IsNotEmpty()
    address: string;
    @IsMongoId()
    departmetn_id: Types.ObjectId;
    @IsMongoId()
    job_id: Types.ObjectId;
}