import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
    @IsNotEmpty()
    @IsString()
    content: string;

    @IsNotEmpty()
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
