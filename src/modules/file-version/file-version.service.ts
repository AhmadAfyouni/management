import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileVersionDocument } from './schema/file-version.schema';

/**
 * Service for managing file versions
 */
@Injectable()
export class FileVersionService {
    constructor(
        @InjectModel('FileVersion') private readonly fileVersionModel: Model<FileVersionDocument>,
    ) { }

    /**
     * Creates a new version of a department file
     * @param fileUrl URL of the file
     * @param departmentId ID of the department
     * @param fileType Type of the file (supporting, template, program)
     * @returns URL of the file
     */
    async createDepartmentFileVersion(
        fileUrl: string,
        departmentId: string,
        fileType: string
    ): Promise<string> {
        return this.createNewVersion({
            fileUrl,
            fileType,
            departmentId: new Types.ObjectId(departmentId)
        });
    }

    /**
     * Creates a new version of an employee file
     * @param fileUrl URL of the file
     * @param empId ID of the employee
     * @param fileType Type of the file (certification, legal_document)
     * @param documentType Type of document
     * @param documentName Name of the document
     * @returns URL of the file
     */
    async createEmployeeFileVersion(
        fileUrl: string,
        empId: string,
        fileType: string,
        documentType: string,
        documentName?: string
    ): Promise<string> {
        return this.createNewVersion({
            fileUrl,
            fileType,
            empId: new Types.ObjectId(empId),
            documentType,
            documentName
        });
    }

    /**
     * Creates a new version of a task file
     * @param fileUrl URL of the file
     * @param taskId ID of the task
     * @param fileType Type of the file (task)
     * @returns URL of the file
     */
    async createTaskFileVersion(
        fileUrl: string,
        taskId: string,
        fileType: string
    ): Promise<string> {
        return this.createNewVersion({
            fileUrl,
            fileType,
            taskId: new Types.ObjectId(taskId)
        });
    }

    /**
     * Core method to create a new file version
     */
    private async createNewVersion(params: {
        fileUrl: string;
        fileType: string;
        departmentId?: Types.ObjectId;
        empId?: Types.ObjectId;
        taskId?: Types.ObjectId;
        documentType?: string;
        documentName?: string;
    }): Promise<string> {
        try {
            // Extract filename from URL
            const urlParts = params.fileUrl.split('/');
            const originalFileName = urlParts[urlParts.length - 1];

            // Build search criteria based on the file and its associated entity
            const searchCriteria: any = {
                originalName: originalFileName,
                fileType: params.fileType
            };

            // Add criteria based on the entity type
            if (params.departmentId) {
                searchCriteria.departmentId = params.departmentId;
            } else if (params.empId) {
                searchCriteria.empId = params.empId;

                if (params.documentType) {
                    searchCriteria.documentType = params.documentType;
                }

                if (params.documentName) {
                    searchCriteria.documentName = params.documentName;
                }
            } else if (params.taskId) {
                searchCriteria.taskId = params.taskId;
            }

            // Find the highest version number for this file
            const highestVersionDoc = await this.fileVersionModel.findOne(searchCriteria)
                .sort({ version: -1 })
                .exec();

            // Calculate new version number
            const newVersion = highestVersionDoc ? highestVersionDoc.version + 1 : 1;

            // Create and save the new version
            const fileVersion = new this.fileVersionModel({
                originalName: originalFileName,
                fileUrl: params.fileUrl,
                version: newVersion,
                fileType: params.fileType,
                ...(params.departmentId && { departmentId: params.departmentId }),
                ...(params.empId && { empId: params.empId }),
                ...(params.taskId && { taskId: params.taskId }),
                ...(params.documentType && { documentType: params.documentType }),
                ...(params.documentName && { documentName: params.documentName })
            });

            await fileVersion.save();

            return params.fileUrl;
        } catch (error) {
            console.error('Error creating new file version:', error);
            throw error;
        }
    }

    /**
     * Get all versions of a department file
     */
    async getDepartmentFileVersions(
        originalName: string,
        departmentId: string,
        fileType: string
    ): Promise<any[]> {
        return this.getAllVersions({
            originalName,
            fileType,
            departmentId: new Types.ObjectId(departmentId)
        });
    }

    /**
     * Get all versions of an employee file
     */
    async getEmployeeFileVersions(
        originalName: string,
        empId: string,
        fileType: string,
        documentType?: string,
        documentName?: string
    ): Promise<any[]> {
        const criteria: any = {
            originalName,
            fileType,
            empId: new Types.ObjectId(empId)
        };

        if (documentType) {
            criteria.documentType = documentType;
        }

        if (documentName) {
            criteria.documentName = documentName;
        }

        return this.getAllVersions(criteria);
    }

    /**
     * Get all versions of a task file
     */
    async getTaskFileVersions(
        originalName: string,
        taskId: string,
        fileType: string
    ): Promise<any[]> {
        return this.getAllVersions({
            originalName,
            fileType,
            taskId: new Types.ObjectId(taskId)
        });
    }

    /**
     * Core method to get all versions of a file
     */
    private async getAllVersions(criteria: any): Promise<any[]> {
        try {
            const versions = await this.fileVersionModel.find(criteria)
                .sort({ version: -1 })  // Most recent first
                .exec() as any;

            return versions.map(version => ({
                fileUrl: version.fileUrl,
                version: version.version,
                createdAt: version.createdAt,
                originalName: version.originalName
            }));
        } catch (error) {
            console.error('Error retrieving file versions:', error);
            throw error;
        }
    }

    /**
     * Get latest version of a department file
     */
    async getLatestDepartmentFileVersion(
        originalName: string,
        departmentId: string,
        fileType: string
    ): Promise<string | null> {
        return this.getLatestVersion({
            originalName,
            fileType,
            departmentId: new Types.ObjectId(departmentId)
        });
    }

    /**
     * Get latest version of an employee file
     */
    async getLatestEmployeeFileVersion(
        originalName: string,
        empId: string,
        fileType: string,
        documentType?: string,
        documentName?: string
    ): Promise<string | null> {
        const criteria: any = {
            originalName,
            fileType,
            empId: new Types.ObjectId(empId)
        };

        if (documentType) {
            criteria.documentType = documentType;
        }

        if (documentName) {
            criteria.documentName = documentName;
        }

        return this.getLatestVersion(criteria);
    }

    /**
     * Get latest version of a task file
     */
    async getLatestTaskFileVersion(
        originalName: string,
        taskId: string,
        fileType: string
    ): Promise<string | null> {
        return this.getLatestVersion({
            originalName,
            fileType,
            taskId: new Types.ObjectId(taskId)
        });
    }

    /**
     * Core method to get the latest version of a file
     */
    private async getLatestVersion(criteria: any): Promise<string | null> {
        try {
            const latestVersion = await this.fileVersionModel.findOne(criteria)
                .sort({ version: -1 })
                .exec();

            return latestVersion ? latestVersion.fileUrl : null;
        } catch (error) {
            console.error('Error retrieving latest file version:', error);
            throw error;
        }
    }

    /**
     * Get a specific version of a file
     */
    async getSpecificVersion(
        originalName: string,
        version: number,
        entityId: string,
        entityType: 'department' | 'employee' | 'task',
        fileType: string,
        documentType?: string,
        documentName?: string
    ): Promise<string | null> {
        try {
            const criteria: any = {
                originalName,
                version,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === 'department') {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === 'employee') {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === 'task') {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            const versionDoc = await this.fileVersionModel.findOne(criteria).exec();
            return versionDoc ? versionDoc.fileUrl : null;
        } catch (error) {
            console.error('Error retrieving specific file version:', error);
            throw error;
        }
    }

    /**
     * Delete all versions of a file
     */
    async deleteAllVersions(
        originalName: string,
        entityId: string,
        entityType: 'department' | 'employee' | 'task',
        fileType: string,
        documentType?: string,
        documentName?: string
    ): Promise<boolean> {
        try {
            const criteria: any = {
                originalName,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === 'department') {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === 'employee') {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === 'task') {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            const result = await this.fileVersionModel.deleteMany(criteria).exec();
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error deleting file versions:', error);
            throw error;
        }
    }

    /**
     * Delete a specific version of a file
     */
    async deleteSpecificVersion(
        originalName: string,
        version: number,
        entityId: string,
        entityType: 'department' | 'employee' | 'task',
        fileType: string,
        documentType?: string,
        documentName?: string
    ): Promise<boolean> {
        try {
            const criteria: any = {
                originalName,
                version,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === 'department') {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === 'employee') {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === 'task') {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            const result = await this.fileVersionModel.deleteOne(criteria).exec();
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error deleting specific file version:', error);
            throw error;
        }
    }
}