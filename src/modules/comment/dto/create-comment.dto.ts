import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
    @IsNotEmpty()
    @IsString()
    content: string;

    @IsNotEmpty()
    taskId: string;

    @IsArray()
    @IsString({ each: true })
    files?: string[];
}
