import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileVersionDocument, FileVersionOld } from './schema/file-version.schema';
import { EntityType, FileType, FileTypeString, UpdateFileVersionDto } from './dto/file-version.dto';

/**
 * Enhanced service for managing file versions with Google Drive-like functionality
 */
@Injectable()
export class FileVersionService {
    constructor(
        @InjectModel('FileVersion') private readonly fileVersionModel: Model<FileVersionDocument>,
    ) { }

    /**
     * Creates a new version of a file
     * @param params File parameters including URL, type, entity IDs, and metadata
     * @returns The file URL
     */
    async createNewFileVersion(params: {
        fileUrl: string;
        fileType: FileType | FileTypeString;
        originalName?: string;
        departmentId?: string;
        empId?: string;
        taskId?: string;
        documentType?: string;
        documentName?: string;
        description?: string;
        createdBy?: string;
        mimeType?: string;
        fileSize?: number;
    }): Promise<string> {
        try {
            // Extract filename from URL if not provided
            if (!params.originalName) {
                const urlParts = params.fileUrl.split('/');
                params.originalName = urlParts[urlParts.length - 1];
            }

            // Build search criteria based on the file and its associated entity
            const searchCriteria: any = {
                originalName: params.originalName,
                fileType: params.fileType
            };

            // Add criteria based on the entity type
            if (params.departmentId) {
                searchCriteria.departmentId = new Types.ObjectId(params.departmentId);
            } else if (params.empId) {
                searchCriteria.empId = new Types.ObjectId(params.empId);

                if (params.documentType) {
                    searchCriteria.documentType = params.documentType;
                }

                if (params.documentName) {
                    searchCriteria.documentName = params.documentName;
                }
            } else if (params.taskId) {
                searchCriteria.taskId = new Types.ObjectId(params.taskId);
            }

            // Find the highest version number for this file
            const highestVersionDoc = await this.fileVersionModel.findOne(searchCriteria)
                .sort({ version: -1 })
                .exec();

            // Calculate new version number
            const newVersion = highestVersionDoc ? highestVersionDoc.version + 1 : 1;

            // Set all existing versions as not current
            if (highestVersionDoc) {
                await this.fileVersionModel.updateMany(
                    searchCriteria,
                    { $set: { isCurrentVersion: false } }
                );
            }

            // Create and save the new version
            const fileVersion = new this.fileVersionModel({
                originalName: params.originalName,
                fileUrl: params.fileUrl,
                version: newVersion,
                fileType: params.fileType,
                isCurrentVersion: true,
                ...(params.departmentId && { departmentId: new Types.ObjectId(params.departmentId) }),
                ...(params.empId && { empId: new Types.ObjectId(params.empId) }),
                ...(params.taskId && { taskId: new Types.ObjectId(params.taskId) }),
                ...(params.documentType && { documentType: params.documentType }),
                ...(params.documentName && { documentName: params.documentName }),
                ...(params.description && { description: params.description }),
                ...(params.createdBy && { createdBy: new Types.ObjectId(params.createdBy) }),
                ...(params.mimeType && { mimeType: params.mimeType }),
                ...(params.fileSize && { fileSize: params.fileSize })
            });

            await fileVersion.save();

            return params.fileUrl;
        } catch (error) {
            console.error('Error creating new file version:', error);
            throw error;
        }
    }

    /**
     * Creates a new version of a department file
     */
    async createDepartmentFileVersion(
        fileUrl: string,
        departmentId: string,
        fileType: FileType | FileTypeString,
        metadata?: {
            description?: string;
            createdBy?: string;
            originalName?: string;
            mimeType?: string;
            fileSize?: number;
        }
    ): Promise<string> {
        return this.createNewFileVersion({
            fileUrl,
            fileType,
            departmentId,
            originalName: metadata?.originalName,
            description: metadata?.description,
            createdBy: metadata?.createdBy,
            mimeType: metadata?.mimeType,
            fileSize: metadata?.fileSize
        });
    }

    /**
     * Creates a new version of an employee file
     */
    async createEmployeeFileVersion(
        fileUrl: string,
        empId: string,
        fileType: FileType | FileTypeString,
        documentType: string,
        metadata?: {
            documentName?: string;
            description?: string;
            createdBy?: string;
            originalName?: string;
            mimeType?: string;
            fileSize?: number;
        }
    ): Promise<string> {
        return this.createNewFileVersion({
            fileUrl,
            fileType,
            empId,
            documentType,
            documentName: metadata?.documentName,
            originalName: metadata?.originalName,
            description: metadata?.description,
            createdBy: metadata?.createdBy,
            mimeType: metadata?.mimeType,
            fileSize: metadata?.fileSize
        });
    }

    /**
     * Creates a new version of a task file
     */
    async createTaskFileVersion(
        fileUrl: string,
        taskId: string,
        fileType: FileType | FileTypeString,
        metadata?: {
            description?: string;
            createdBy?: string;
            originalName?: string;
            mimeType?: string;
            fileSize?: number;
        }
    ): Promise<string> {
        return this.createNewFileVersion({
            fileUrl,
            fileType,
            taskId,
            originalName: metadata?.originalName,
            description: metadata?.description,
            createdBy: metadata?.createdBy,
            mimeType: metadata?.mimeType,
            fileSize: metadata?.fileSize
        });
    }

    /**
     * Get all versions of a file
     */
    async getAllFileVersions(params: {
        originalName: string;
        fileType: FileType | FileTypeString;
        entityType: EntityType | string;
        entityId: string;
        documentType?: string;
        documentName?: string;
    }): Promise<any[]> {
        try {
            const { originalName, fileType, entityType, entityId, documentType, documentName } = params;

            const criteria: any = {
                originalName,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT || entityType === 'department') {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE || entityType === 'employee') {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === EntityType.TASK || entityType === 'task') {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            const versions = await this.fileVersionModel.find(criteria)
                .sort({ version: -1 })  // Most recent first
                .populate('createdBy', 'name email')
                .exec();

            return versions.map(version => ({
                id: version._id,
                fileUrl: version.fileUrl,
                version: version.version,
                createdAt: version.createdAt,
                originalName: version.originalName,
                description: version.description,
                createdBy: version.createdBy,
                mimeType: version.mimeType,
                fileSize: version.fileSize,
                isCurrentVersion: version.isCurrentVersion
            }));
        } catch (error) {
            console.error('Error retrieving file versions:', error);
            throw error;
        }
    }

    /**
     * Get all versions of a department file
     */
    async getDepartmentFileVersions(
        originalName: string,
        departmentId: string,
        fileType: FileType | FileTypeString
    ): Promise<any[]> {
        return this.getAllFileVersions({
            originalName,
            fileType,
            entityType: 'department',
            entityId: departmentId
        });
    }

    /**
     * Get all versions of an employee file
     */
    async getEmployeeFileVersions(
        originalName: string,
        empId: string,
        fileType: FileType | FileTypeString,
        documentType?: string,
        documentName?: string
    ): Promise<any[]> {
        return this.getAllFileVersions({
            originalName,
            fileType,
            entityType: 'employee',
            entityId: empId,
            documentType,
            documentName
        });
    }

    /**
     * Get all versions of a task file
     */
    async getTaskFileVersions(
        originalName: string,
        taskId: string,
        fileType: FileType | FileTypeString
    ): Promise<any[]> {
        return this.getAllFileVersions({
            originalName,
            fileType,
            entityType: 'task',
            entityId: taskId
        });
    }

    /**
     * Get the current version of a file
     */
    async getCurrentVersion(params: {
        originalName: string;
        fileType: FileType | FileTypeString;
        entityType: EntityType | string;
        entityId: string;
        documentType?: string;
        documentName?: string;
    }): Promise<any> {
        try {
            const { originalName, fileType, entityType, entityId, documentType, documentName } = params;

            const criteria: any = {
                originalName,
                fileType,
                isCurrentVersion: true
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            const currentVersion = await this.fileVersionModel.findOne(criteria)
                .populate('createdBy', 'name email')
                .exec();

            if (!currentVersion) {
                // If no version is marked as current, get the latest version by number
                const latestVersion = await this.fileVersionModel.findOne({
                    ...criteria,
                    isCurrentVersion: { $exists: true }  // Remove this filter
                })
                    .sort({ version: -1 })
                    .populate('createdBy', 'name email')
                    .exec();

                if (!latestVersion) {
                    return null;
                }

                // Update it as the current version
                await this.fileVersionModel.updateOne(
                    { _id: latestVersion._id },
                    { $set: { isCurrentVersion: true } }
                );

                return {
                    id: latestVersion._id,
                    fileUrl: latestVersion.fileUrl,
                    version: latestVersion.version,
                    createdAt: latestVersion.createdAt,
                    originalName: latestVersion.originalName,
                    description: latestVersion.description,
                    createdBy: latestVersion.createdBy,
                    mimeType: latestVersion.mimeType,
                    fileSize: latestVersion.fileSize,
                    isCurrentVersion: true
                };
            }

            return {
                id: currentVersion._id,
                fileUrl: currentVersion.fileUrl,
                version: currentVersion.version,
                createdAt: currentVersion.createdAt,
                originalName: currentVersion.originalName,
                description: currentVersion.description,
                createdBy: currentVersion.createdBy,
                mimeType: currentVersion.mimeType,
                fileSize: currentVersion.fileSize,
                isCurrentVersion: currentVersion.isCurrentVersion
            };
        } catch (error) {
            console.error('Error retrieving current file version:', error);
            throw error;
        }
    }

    /**
     * Get a specific version of a file
     */
    async getSpecificVersion(params: {
        originalName: string;
        version: number;
        fileType: FileType | FileTypeString;
        entityType: EntityType | string;
        entityId: string;
        documentType?: string;
        documentName?: string;
    }): Promise<any> {
        try {
            const { originalName, version, fileType, entityType, entityId, documentType, documentName } = params;

            const criteria: any = {
                originalName,
                version,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            const versionDoc = await this.fileVersionModel.findOne(criteria)
                .populate('createdBy', 'name email')
                .exec();

            if (!versionDoc) {
                return null;
            }

            return {
                id: versionDoc._id,
                fileUrl: versionDoc.fileUrl,
                version: versionDoc.version,
                createdAt: versionDoc.createdAt,
                originalName: versionDoc.originalName,
                description: versionDoc.description,
                createdBy: versionDoc.createdBy,
                mimeType: versionDoc.mimeType,
                fileSize: versionDoc.fileSize,
                isCurrentVersion: versionDoc.isCurrentVersion
            };
        } catch (error) {
            console.error('Error retrieving specific file version:', error);
            throw error;
        }
    }

    /**
     * Update metadata for a specific version
     */
    async updateVersionMetadata(
        versionId: string,
        updateDto: UpdateFileVersionDto
    ): Promise<any> {
        try {
            const fileVersion = await this.fileVersionModel.findById(versionId);

            if (!fileVersion) {
                throw new NotFoundException('File version not found');
            }

            if (updateDto.description !== undefined) {
                fileVersion.description = updateDto.description;
            }

            await fileVersion.save();

            return {
                id: fileVersion._id,
                fileUrl: fileVersion.fileUrl,
                version: fileVersion.version,
                description: fileVersion.description,
                isCurrentVersion: fileVersion.isCurrentVersion
            };
        } catch (error) {
            console.error('Error updating file version metadata:', error);
            throw error;
        }
    }

    /**
     * Restore a previous version as the current version
     */
    async restoreVersion(params: {
        originalName: string;
        versionToRestore: number;
        fileType: FileType | FileTypeString;
        entityType: EntityType | string;
        entityId: string;
        documentType?: string;
        documentName?: string;
        createdBy?: string;
    }): Promise<any> {
        try {
            const {
                originalName,
                versionToRestore,
                fileType,
                entityType,
                entityId,
                documentType,
                documentName,
                createdBy
            } = params;

            // Find the version to restore
            const versionCriteria: any = {
                originalName,
                version: versionToRestore,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                versionCriteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                versionCriteria.empId = new Types.ObjectId(entityId);
                if (documentType) versionCriteria.documentType = documentType;
                if (documentName) versionCriteria.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
                versionCriteria.taskId = new Types.ObjectId(entityId);
            }

            const versionToRestoreDoc = await this.fileVersionModel.findOne(versionCriteria).exec();

            if (!versionToRestoreDoc) {
                throw new NotFoundException(`Version ${versionToRestore} not found`);
            }

            // If this version is already the current version, do nothing
            if (versionToRestoreDoc.isCurrentVersion) {
                return {
                    fileUrl: versionToRestoreDoc.fileUrl,
                    version: versionToRestoreDoc.version,
                    message: 'This version is already the current version'
                };
            }

            // Find and update all versions to set isCurrentVersion to false
            const searchCriteria: any = {
                originalName,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                searchCriteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                searchCriteria.empId = new Types.ObjectId(entityId);
                if (documentType) searchCriteria.documentType = documentType;
                if (documentName) searchCriteria.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
                searchCriteria.taskId = new Types.ObjectId(entityId);
            }

            await this.fileVersionModel.updateMany(
                searchCriteria,
                { $set: { isCurrentVersion: false } }
            );

            // Create a new version based on the version to restore
            const highestVersionDoc = await this.fileVersionModel.findOne(searchCriteria)
                .sort({ version: -1 })
                .exec();

            const newVersion = highestVersionDoc ? highestVersionDoc.version + 1 : 1;

            // Create and save the new version
            const fileVersion = new this.fileVersionModel({
                originalName: versionToRestoreDoc.originalName,
                fileUrl: versionToRestoreDoc.fileUrl,
                version: newVersion,
                fileType: versionToRestoreDoc.fileType,
                isCurrentVersion: true,
                ...(versionToRestoreDoc.departmentId && { departmentId: versionToRestoreDoc.departmentId }),
                ...(versionToRestoreDoc.empId && { empId: versionToRestoreDoc.empId }),
                ...(versionToRestoreDoc.taskId && { taskId: versionToRestoreDoc.taskId }),
                ...(versionToRestoreDoc.documentType && { documentType: versionToRestoreDoc.documentType }),
                ...(versionToRestoreDoc.documentName && { documentName: versionToRestoreDoc.documentName }),
                description: `Restored from version ${versionToRestore}`,
                ...(createdBy && { createdBy: new Types.ObjectId(createdBy) }),
                ...(versionToRestoreDoc.mimeType && { mimeType: versionToRestoreDoc.mimeType }),
                ...(versionToRestoreDoc.fileSize && { fileSize: versionToRestoreDoc.fileSize })
            });

            await fileVersion.save();

            return {
                fileUrl: fileVersion.fileUrl,
                version: fileVersion.version,
                message: `Version ${versionToRestore} successfully restored as version ${newVersion}`
            };
        } catch (error) {
            console.error('Error restoring file version:', error);
            throw error;
        }
    }

    /**
     * Compare two versions of a file
     */
    async compareVersions(params: {
        originalName: string;
        version1: number;
        version2: number;
        fileType: FileType | FileTypeString;
        entityType: EntityType | string;
        entityId: string;
        documentType?: string;
        documentName?: string;
    }): Promise<any> {
        try {
            const {
                originalName,
                version1,
                version2,
                fileType,
                entityType,
                entityId,
                documentType,
                documentName
            } = params;

            // Find both versions
            const criteriaBase: any = {
                originalName,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                criteriaBase.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                criteriaBase.empId = new Types.ObjectId(entityId);
                if (documentType) criteriaBase.documentType = documentType;
                if (documentName) criteriaBase.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
                criteriaBase.taskId = new Types.ObjectId(entityId);
            }

            const version1Doc = await this.fileVersionModel.findOne({
                ...criteriaBase,
                version: version1
            })
                .populate('createdBy', 'name email')
                .exec();

            const version2Doc = await this.fileVersionModel.findOne({
                ...criteriaBase,
                version: version2
            })
                .populate('createdBy', 'name email')
                .exec();

            if (!version1Doc || !version2Doc) {
                throw new NotFoundException('One or both versions not found');
            }

            return {
                version1: {
                    fileUrl: version1Doc.fileUrl,
                    version: version1Doc.version,
                    createdAt: version1Doc.createdAt,
                    description: version1Doc.description,
                    createdBy: version1Doc.createdBy,
                    isCurrentVersion: version1Doc.isCurrentVersion
                },
                version2: {
                    fileUrl: version2Doc.fileUrl,
                    version: version2Doc.version,
                    createdAt: version2Doc.createdAt,
                    description: version2Doc.description,
                    createdBy: version2Doc.createdBy,
                    isCurrentVersion: version2Doc.isCurrentVersion
                }
            };
        } catch (error) {
            console.error('Error comparing file versions:', error);
            throw error;
        }
    }

    /**
     * Delete all versions of a file
     */
    async deleteAllVersions(params: {
        originalName: string;
        entityType: EntityType | string;
        entityId: string;
        fileType: FileType | FileTypeString;
        documentType?: string;
        documentName?: string;
    }): Promise<boolean> {
        try {
            const { originalName, entityType, entityId, fileType, documentType, documentName } = params;

            const criteria: any = {
                originalName,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
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
    async deleteSpecificVersion(params: {
        originalName: string;
        version: number;
        entityType: EntityType | string;
        entityId: string;
        fileType: FileType | FileTypeString;
        documentType?: string;
        documentName?: string;
    }): Promise<boolean> {
        try {
            const { originalName, version, entityType, entityId, fileType, documentType, documentName } = params;

            const criteria: any = {
                originalName,
                version,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            // Check if this is the current version
            const versionDoc = await this.fileVersionModel.findOne(criteria).exec();

            if (!versionDoc) {
                return false;
            }

            if (versionDoc.isCurrentVersion) {
                throw new BadRequestException('Cannot delete the current version. Set another version as current first.');
            }

            const result = await this.fileVersionModel.deleteOne(criteria).exec();
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error deleting specific file version:', error);
            throw error;
        }
    }

    /**
     * Get file version history with pagination
     */
    async getFileVersionHistory(params: {
        originalName: string;
        fileType: FileType | FileTypeString;
        entityType: EntityType | string;
        entityId: string;
        documentType?: string;
        documentName?: string;
        page?: number;
        limit?: number;
    }): Promise<{ versions: any[], total: number, page: number, limit: number }> {
        try {
            const {
                originalName,
                fileType,
                entityType,
                entityId,
                documentType,
                documentName,
                page = 1,
                limit = 10
            } = params;

            const criteria: any = {
                originalName,
                fileType
            };

            // Set the appropriate entity ID field
            if (entityType === EntityType.DEPARTMENT) {
                criteria.departmentId = new Types.ObjectId(entityId);
            } else if (entityType === EntityType.EMPLOYEE) {
                criteria.empId = new Types.ObjectId(entityId);
                if (documentType) criteria.documentType = documentType;
                if (documentName) criteria.documentName = documentName;
            } else if (entityType === EntityType.TASK) {
                criteria.taskId = new Types.ObjectId(entityId);
            }

            const skip = (page - 1) * limit;

            const [versions, total] = await Promise.all([
                this.fileVersionModel.find(criteria)
                    .sort({ version: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('createdBy', 'name email')
                    .exec(),
                this.fileVersionModel.countDocuments(criteria).exec()
            ]);

            return {
                versions: versions.map(version => ({
                    id: version._id,
                    fileUrl: version.fileUrl,
                    version: version.version,
                    createdAt: version.createdAt,
                    originalName: version.originalName,
                    description: version.description,
                    createdBy: version.createdBy,
                    mimeType: version.mimeType,
                    fileSize: version.fileSize,
                    isCurrentVersion: version.isCurrentVersion
                })),
                total,
                page,
                limit
            };
        } catch (error) {
            console.error('Error retrieving file version history:', error);
            throw error;
        }
    }
}