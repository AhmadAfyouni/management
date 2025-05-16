import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsMongoId()
    taskId: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    files?: string[];
}
export class UpdateCommentDto {
    @IsNotEmpty()
    @IsString()
    content: string;
}
