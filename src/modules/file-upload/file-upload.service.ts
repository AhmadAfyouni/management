import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { DirectoryListing, FileInfo } from './dto/file-info.dto';


@Injectable()
export class FileUploadService {
    private readonly logger = new Logger(FileUploadService.name);
    private readonly uploadsDir = join(process.cwd(), 'uploads');

    constructor() {
        // Ensure uploads directory exists
        if (!existsSync(this.uploadsDir)) {
            mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    /**
     * Clean path to prevent directory traversal attacks
     */
    cleanPath(path: string): string {
        return path.replace(/\.\./g, '').replace(/[^\w\/\-]/g, '');
    }

    /**
     * Save a single file
     */
    saveFile(file: Express.Multer.File, customPath: string = ''): any {
        try {
            const cleanedPath = this.cleanPath(customPath);
            const fullPath = join(this.uploadsDir, cleanedPath);

            // Create directory if it doesn't exist
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
            }

            // Create unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileName = uniqueSuffix + this.getFileExtension(file.originalname);
            const filePath = join(fullPath, fileName);

            // Write the file
            writeFileSync(filePath, file.buffer);

            // Generate public URL
            const publicUrl = `/public-files/${cleanedPath}/${fileName}`;

            return {
                originalname: file.originalname,
                filename: fileName,
                path: filePath,
                publicUrl: publicUrl,
                size: file.size,
                customPath: cleanedPath
            };
        } catch (error) {
            this.logger.error(`Error saving file: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Save multiple files
     */
    saveFiles(files: Express.Multer.File[], customPath: string = ''): any[] {
        try {
            const cleanedPath = this.cleanPath(customPath);
            const fullPath = join(this.uploadsDir, cleanedPath);

            // Create directory if it doesn't exist
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
            }

            // Process each file
            return files.map(file => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const fileName = uniqueSuffix + this.getFileExtension(file.originalname);
                const filePath = join(fullPath, fileName);

                // Write the file
                writeFileSync(filePath, file.buffer);

                // Generate public URL
                const publicUrl = `/public-files/${cleanedPath}/${fileName}`;

                return {
                    originalname: file.originalname,
                    filename: fileName,
                    path: filePath,
                    publicUrl: publicUrl,
                    size: file.size
                };
            });
        } catch (error) {
            this.logger.error(`Error saving files: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Delete a file
     */
    deleteFile(customPath: string, filename: string): boolean {
        try {
            const cleanedPath = this.cleanPath(customPath);
            const filePath = join(this.uploadsDir, cleanedPath, filename);

            if (!existsSync(filePath)) {
                return false;
            }

            unlinkSync(filePath);
            return true;
        } catch (error) {
            this.logger.error(`Error deleting file: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * List files in a directory
     */
    listFiles(customPath: string = ''): DirectoryListing | null {
        try {
            const cleanedPath = this.cleanPath(customPath);
            const fullPath = join(this.uploadsDir, cleanedPath);

            this.logger.log(`Attempting to list directory: ${fullPath}`);

            if (!existsSync(fullPath)) {
                return null;
            }

            const entries = readdirSync(fullPath, { withFileTypes: true });
            const files: FileInfo[] = [];
            const directories: string[] = [];

            entries.forEach(entry => {
                if (entry.isDirectory()) {
                    directories.push(entry.name);
                } else {
                    const fileStat = statSync(join(fullPath, entry.name));
                    const publicUrl = `/public-files/${cleanedPath}/${entry.name}`;

                    files.push({
                        name: entry.name,
                        size: fileStat.size,
                        created: fileStat.birthtime,
                        modified: fileStat.mtime,
                        publicUrl: publicUrl
                    });
                }
            });

            return {
                currentPath: cleanedPath,
                directories,
                files
            };
        } catch (error) {
            this.logger.error(`Error listing files: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get a file path
     */
    getFilePath(customPath: string, filename: string): string | null {
        const cleanedPath = this.cleanPath(customPath);
        const filePath = join(this.uploadsDir, cleanedPath, filename);

        if (!existsSync(filePath)) {
            return null;
        }

        return filePath;
    }

    /**
     * Get file extension from filename
     */
    private getFileExtension(filename: string): string {
        return filename.substring(filename.lastIndexOf('.'));
    }
}