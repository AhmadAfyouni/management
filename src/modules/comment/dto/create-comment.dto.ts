import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    @IsOptional()
    content: string;

    @IsMongoId()
    taskId: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    fileUrl?: string;
}
export class UpdateCommentDto {
    @IsNotEmpty()
    @IsString()
    @IsOptional()
    content: string;
}
