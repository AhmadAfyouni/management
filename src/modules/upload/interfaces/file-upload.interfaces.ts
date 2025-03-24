export interface FileUploadConfig {
    maxSize?: number;
    allowedMimeTypes?: string[];
    fieldName: string;
    maxCount?: number;
}


export interface FileUploadResult {
    fieldName: string;
    originalname: string;
    path: string;
    mimeType: string;
    size: number;
}


export interface MultiFieldUploadResult {
    [key: string]: string[];
}
