import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class FileUploadService {
  private readonly fileStorageUrl: string;

  constructor(private configService: ConfigService) {
    this.fileStorageUrl = this.configService.get<string>('FILE_STORAGE_URL') || 'http://localhost:3002';
  }

  /**
   * Upload a single file to the file storage service
   * @param file The file to upload (from multer)
   * @param path The destination path where the file should be stored
   * @param token Authentication token
   * @returns The file path in the storage service
   */
  async uploadSingleFile(file: any, path: string, token: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, file.originalname);
      formData.append('path', path);

      const response = await axios.post(
        `${this.fileStorageUrl}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.data || !response.data.file || !response.data.file.path) {
        throw new Error('File upload failed');
      }

      return response.data.file.path;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Upload multiple files to the file storage service
   * @param files Array of files to upload
   * @param path The destination path
   * @param token Authentication token
   * @returns Array of file paths
   */
  async uploadMultipleFiles(files: any[], path: string, token: string): Promise<string[]> {
    try {
      const uploadPromises = files.map(file => this.uploadSingleFile(file, path, token));
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      throw new InternalServerErrorException('Failed to upload multiple files');
    }
  }

  /**
   * Process files from a multipart form with multiple file fields
   * @param files Object containing file arrays by field name
   * @param baseDir Base directory for storing files
   * @param entityId Entity ID for the related record (e.g., departmentId, userId)
   * @param token Authentication token
   * @returns Object with paths for each file field
   */
  async processMultiFieldFiles(
    files: Record<string, any[]>,
    baseDir: string,
    entityId: string,
    token: string
  ): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    for (const [fieldName, fieldFiles] of Object.entries(files)) {
      if (fieldFiles && fieldFiles.length) {
        // Convert field name to kebab case for directories (e.g., supportingFiles → supporting-files)
        const dirName = fieldName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        const uploadPath = `${baseDir}/${entityId}/${dirName}`;
        
        result[fieldName] = await this.uploadMultipleFiles(fieldFiles, uploadPath, token);
      } else {
        result[fieldName] = [];
      }
    }

    return result;
  }
}