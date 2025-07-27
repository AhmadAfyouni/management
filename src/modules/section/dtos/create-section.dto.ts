import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsEnum } from 'class-validator';

export class CreateSectionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsMongoId()
    emp: string;

    @IsOptional()
    @IsEnum(["default", "normar"])
    type: "default" | "normal"
}
