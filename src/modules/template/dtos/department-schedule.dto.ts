import { IsEnum, IsNumber, IsMongoId, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DurationUnit } from '../types/field.enum';

export class DurationDto {
    @IsEnum(DurationUnit)
    unit: DurationUnit;

    @IsNumber()
    value: number;
}

