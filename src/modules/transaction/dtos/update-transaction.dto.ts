import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { TransactionStatus } from '../types/transaction.enum';
import { CreateTransactionDto } from './create-transaction.dto';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
    @IsEnum(TransactionStatus)
    @IsOptional()
    status?: TransactionStatus;
}
