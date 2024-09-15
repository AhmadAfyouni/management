import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTaskTypeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;
}
