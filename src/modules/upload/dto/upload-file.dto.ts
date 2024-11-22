import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsMimeType,
  Matches,
  ValidateNested,
  IsArray,
} from 'class-validator';

class FileDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @IsMimeType()
  @Matches(/^image\/(jpeg|png|gif|bmp|webp)$/, {
    message:
      'Content type must be a valid image MIME type (jpeg, png, gif, bmp, webp).',
  })
  contentType: string;
}

export class UploadFileDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files: FileDto[];
}
