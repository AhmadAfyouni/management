import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class TransactionLogDto {
    @IsMongoId()
    department_id: string;

    @IsString()
    @IsNotEmpty()
    finished_at: string;

    @IsString()
    @IsNotEmpty()
    note: string;
}
