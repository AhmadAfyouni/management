import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsMongoId()
    taskId: string;

    @IsString()
    @IsNotEmpty()
    fileUrl?: string;
}
export class UpdateCommentDto {
    @IsNotEmpty()
    @IsString()
    content: string;
}
