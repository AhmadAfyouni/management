import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileVersionDocument } from './schemas/file-version.scheme';
import { FileDocument } from './schemas/file.scheme';

@Injectable()
export class FileService {
    constructor(
        @InjectModel('File') private readonly fileModel: Model<FileDocument>,
        @InjectModel('FileVersion') private readonly fileVersionModel: Model<FileVersionDocument>,
    ) { }

    /**
     * Upload a new file or create a new version of an existing file
     */
    async uploadFile(dto: {
        fileUrl: string;
        originalName: string;
        entityType: string;
        entityId: string;
        fileType?: string;
        description?: string;
        createdBy?: string;
    }): Promise<any> {
        try {
            // Ensure fileType is always set by providing a default value if not specified
            const fileType = dto.fileType || 'document';

            // Check if the file already exists for this entity
            const existingFile = await this.fileModel.findOne({
                entityType: dto.entityType,
                entityId: new Types.ObjectId(dto.entityId),
                ...(dto.fileType && { fileType: dto.fileType }),
            });

            if (!existingFile) {
                // Create new file first
                const newFile = {
                    originalName: dto.originalName,
                    entityType: dto.entityType,
                    entityId: new Types.ObjectId(dto.entityId),
                    fileType: fileType,
                };

                const savedFile = await this.fileModel.create(newFile);

                // Create first version
                const fileVersion = new this.fileVersionModel({
                    fileId: savedFile._id, // This property will be stored as file_reference in MongoDB
                    fileUrl: dto.fileUrl,
                    originalName: dto.originalName,
                    version: 1,
                    isCurrentVersion: true,
                    fileType: fileType,
                    description: dto.description || 'Initial version',
                    ...(dto.createdBy && { createdBy: new Types.ObjectId(dto.createdBy) }),
                });

                // Save the version - debug logs are in the pre-save hook
                const savedVersion = await fileVersion.save();

                // Update the file with the current version ID
                await this.fileModel.findByIdAndUpdate(
                    savedFile._id,
                    { currentVersion: savedVersion._id }
                );

                // Log the saved version for verification
                console.log('New file created:', {
                    fileId: savedFile._id.toString(),
                    versionId: savedVersion._id.toString(),
                    versionFileId: savedVersion.fileId ? savedVersion.fileId.toString() : 'undefined'
                });

                return {
                    fileId: savedFile._id,
                    versionId: savedVersion._id,
                    version: 1,
                    fileUrl: dto.fileUrl,
                    message: 'File uploaded successfully',
                };
            } else {
                // File exists, create a new version
                const latestVersion = await this.fileVersionModel
                    .findOne({ fileId: existingFile._id })
                    .sort({ version: -1 });

                const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

                // Set all existing versions of this file to not current
                await this.fileVersionModel.updateMany(
                    { fileId: existingFile._id },
                    { $set: { isCurrentVersion: false } }
                );

                // Create new version
                const fileVersion = new this.fileVersionModel({
                    fileId: existingFile._id,
                    fileUrl: dto.fileUrl,
                    originalName: dto.originalName,
                    version: newVersionNumber,
                    isCurrentVersion: true,
                    fileType: fileType,
                    description: dto.description || `Version ${newVersionNumber}`,
                    ...(dto.createdBy && { createdBy: new Types.ObjectId(dto.createdBy) }),
                });

                // Save the version - debug logs are in the pre-save hook
                const savedVersion = await fileVersion.save();

                // Update the file's current version
                await this.fileModel.findByIdAndUpdate(
                    existingFile._id,
                    {
                        currentVersion: savedVersion._id,
                        fileType: fileType // Update the file type in case it changed
                    }
                );

                // Log the saved version for verification
                console.log('New version created:', {
                    fileId: existingFile._id.toString(),
                    versionId: savedVersion._id.toString(),
                    versionFileId: savedVersion.fileId ? savedVersion.fileId.toString() : 'undefined',
                    versionNumber: newVersionNumber
                });

                return {
                    fileId: existingFile._id,
                    versionId: savedVersion._id,
                    version: newVersionNumber,
                    fileUrl: dto.fileUrl,
                    message: `New version (${newVersionNumber}) created successfully`,
                };
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    // Keep the rest of methods unchanged
    /**
     * Get all versions of a file
     */
    async getFileVersions(fileId: string): Promise<any[]> {
        try {
            const fileObjectId = new Types.ObjectId(fileId);

            // Verify file exists
            const file = await this.fileModel.findById(fileObjectId);
            if (!file) {
                throw new Error(`File with ID ${fileId} not found`);
            }

            // Get all versions of this file
            const versions = await this.fileVersionModel
                .find({ fileId: fileObjectId })
                .sort({ version: -1 })
                .populate('createdBy', 'name email')
                .exec();

            return versions.map(version => ({
                id: version._id,
                version: version.version,
                fileUrl: version.fileUrl,
                isCurrentVersion: version.isCurrentVersion,
                description: version.description,
                createdBy: version.createdBy,
                createdAt: version.createdAt,
                fileId: version.fileId,
            }));
        } catch (error) {
            console.error('Error getting file versions:', error);
            throw error;
        }
    }

    /**
     * Set a specific version as the current version
     */
    async setCurrentVersion(versionId: string): Promise<any> {
        try {
            const versionObjectId = new Types.ObjectId(versionId);

            // Find the version
            const version = await this.fileVersionModel.findById(versionObjectId);
            if (!version) {
                throw new Error(`Version with ID ${versionId} not found`);
            }

            // Set all versions of this file to not current
            await this.fileVersionModel.updateMany(
                { fileId: version.fileId },
                { $set: { isCurrentVersion: false } }
            );

            // Set this version as current
            version.isCurrentVersion = true;
            await version.save();

            // Update the file's current version
            await this.fileModel.findByIdAndUpdate(
                version.fileId,
                { currentVersion: versionObjectId }
            );

            return {
                success: true,
                message: `Version ${version.version} set as current`,
                versionId: version._id,
                version: version.version,
                fileUrl: version.fileUrl,
                fileId: version.fileId,
            };
        } catch (error) {
            console.error('Error setting current version:', error);
            throw error;
        }
    }

    /**
     * Get files by entity (department, employee, task)
     */
    async getFilesByEntity(entityType: string, entityId: string, fileType?: string): Promise<any[]> {
        try {
            const query: any = {
                entityType,
                entityId: new Types.ObjectId(entityId),
            };

            if (fileType) {
                query.fileType = fileType;
            }

            const files = await this.fileModel.find(query).populate('currentVersion').exec();

            return files.map(file => {
                const currentVersion = file.currentVersion as any;
                return {
                    id: file._id,
                    originalName: file.originalName,
                    fileType: file.fileType,
                    currentVersionId: currentVersion?._id,
                    version: currentVersion?.version,
                    fileUrl: currentVersion?.fileUrl,
                    description: currentVersion?.description,
                    updatedAt: currentVersion?.createdAt,
                };
            });
        } catch (error) {
            console.error('Error getting files by entity:', error);
            throw error;
        }
    }

    /**
     * Delete a file and all its versions
     */
    async deleteFile(fileId: string): Promise<boolean> {
        try {
            const fileObjectId = new Types.ObjectId(fileId);

            // Delete all versions
            await this.fileVersionModel.deleteMany({ fileId: fileObjectId });

            // Delete the file
            const result = await this.fileModel.findByIdAndDelete(fileObjectId);

            return !!result;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * Delete a specific version of a file
     * Note: Cannot delete the current version
     */
    async deleteVersion(versionId: string): Promise<boolean> {
        try {
            const versionObjectId = new Types.ObjectId(versionId);

            // Find the version
            const version = await this.fileVersionModel.findById(versionObjectId);
            if (!version) {
                throw new Error(`Version with ID ${versionId} not found`);
            }

            // Cannot delete the current version
            if (version.isCurrentVersion) {
                throw new Error('Cannot delete the current version. Set another version as current first.');
            }

            // Delete the version
            await this.fileVersionModel.findByIdAndDelete(versionObjectId);

            return true;
        } catch (error) {
            console.error('Error deleting version:', error);
            throw error;
        }
    }
}