import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { FieldType } from '../types/field.enum';

export class TransactionFieldDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(FieldType)
    type: FieldType;
}

