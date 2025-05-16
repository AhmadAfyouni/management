export class FileInfoDto {
  originalname: string;
  filename: string;
  path: string;
  publicUrl: string;
  size: number;
  customPath?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  created: Date;
  modified: Date;
  publicUrl: string;
}

export interface DirectoryListing {
  currentPath: string;
  directories: string[];
  files: FileInfo[];
}

// Define interfaces for file upload responses
export interface FileUploadInfo {
  originalname: string;
  filename: string;
  path: string;
  publicUrl: string;
  size: number;
  customPath?: string;
}

export interface FileUploadDto {
  path?: string;
}
