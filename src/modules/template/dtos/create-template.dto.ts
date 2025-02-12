import { IsString, IsArray, IsNotEmpty, ValidateNested, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { DurationDto } from './department-schedule.dto';
import { TransactionFieldDto } from './transaction-field.dto';

export class CreateTemplateDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsArray()
    // @IsMongoId()
    departments_approval_track: string[];


    @IsArray()
    // @IsMongoId()
    departments_execution_ids: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TransactionFieldDto)
    transactionFields: TransactionFieldDto[];

    @IsBoolean()
    @IsOptional()
    needAdminApproval: boolean;

    @ValidateNested()
    @Type(() => DurationDto)
    duration: DurationDto;

}
