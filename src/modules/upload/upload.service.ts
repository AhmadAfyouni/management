import { Injectable } from '@nestjs/common';
import { UploadFileDto } from './dto/upload-file.dto';
import { v4 as uuidv4 } from 'uuid'; // Import UUID
import { S3Service } from 'src/integration/aws/services/s3.service';

@Injectable()
export class UploadService {
  constructor(private readonly s3Service: S3Service) { }

  async generateUploadAndDownloadURL(createUpload: UploadFileDto) {
    const files = await Promise.all(
      createUpload.files.map(async (file) => {
        const { fileName, contentType } = file;
        const redactedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
        const uniqueSuffix = `${uuidv4()}`; 
        const key = `files/${new Date().toLocaleDateString('en-CA')}/${uniqueSuffix}-${redactedFileName}`;
        const uploadUrl = await this.s3Service.getUploadUrl(key, contentType);
        const downloadUrl = await this.s3Service.getDownloadUrl(key);
        return {
          fileName,
          contentType,
          key,
          uploadUrl,
          downloadUrl,
        };
      }),
    );
    return { files };
  }
}
