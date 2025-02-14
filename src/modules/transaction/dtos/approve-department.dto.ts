import { IsString, IsNotEmpty, IsMongoId, IsEnum } from 'class-validator';
import { TransactionAction } from '../types/transaction.enum';

export class ApproveDepartmentDto {

    @IsMongoId()
    transaction_id: string;
    @IsEnum(TransactionAction)
    action: TransactionAction;

    @IsString()
    @IsNotEmpty()
    note: string;
}

