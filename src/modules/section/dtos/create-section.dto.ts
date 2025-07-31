import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsEnum } from 'class-validator';

export class CreateSectionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsMongoId()
    emp: string;

    @IsOptional()
    @IsEnum(["default", "normal"])
    type: "default" | "normal"

    @IsOptional()
    @IsEnum(["BY_ME", "FOR_ME"])
    type_section?: "BY_ME" | "FOR_ME"
}
