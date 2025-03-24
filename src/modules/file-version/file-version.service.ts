import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FileVersionDocument } from './schema/file-version.schema';
import * as path from 'path';

@Injectable()
export class FileVersionService {
    constructor(
        @InjectModel('FileVersion') private readonly fileVersionModel: Model<FileVersionDocument>,
    ) { }

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


 

  
    private async createNewVersion(params: {
        fileUrl: string;
        fileType: string;
        departmentId?: Types.ObjectId;
        empId?: Types.ObjectId;
        documentType?: string;
        documentName?: string;
    }): Promise<string> {
        try {
            const urlParts = params.fileUrl.split('/');
            const originalFileName = urlParts[urlParts.length - 1];

            const searchCriteria: any = {
                originalName: originalFileName,
                fileType: params.fileType
            };

            // إضافة المعايير حسب نوع الكيان المرتبط بالملف
            if (params.departmentId) {
                searchCriteria.departmentId = params.departmentId;
            } else if (params.empId) {
                searchCriteria.empId = params.empId;

                // إضافة نوع الوثيقة إذا كان متاحًا
                if (params.documentType) {
                    searchCriteria.documentType = params.documentType;
                }

                // إضافة اسم الوثيقة إذا كان متاحًا
                if (params.documentName) {
                    searchCriteria.documentName = params.documentName;
                }
            }

            // الحصول على أعلى رقم إصدار
            const highestVersionDoc = await this.fileVersionModel.findOne(searchCriteria)
                .sort({ version: -1 })
                .exec();

            const newVersion = highestVersionDoc ? highestVersionDoc.version + 1 : 1;

            const fileVersion = new this.fileVersionModel({
                originalName: originalFileName,
                fileUrl: params.fileUrl,
                version: newVersion,
                fileType: params.fileType,
                ...(params.departmentId && { departmentId: params.departmentId }),
                ...(params.empId && { empId: params.empId }),
                ...(params.documentType && { documentType: params.documentType }),
                ...(params.documentName && { documentName: params.documentName })
            });

            await fileVersion.save();

            // إرجاع رابط الملف
            return params.fileUrl;
        } catch (error) {
            console.error('خطأ في إنشاء نسخة جديدة من الملف:', error);
            throw error;
        }
    }

    /**
     * الحصول على جميع نسخ ملف مرتبط بقسم
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
     * الحصول على جميع نسخ ملف مرتبط بموظف
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
     * الحصول على جميع نسخ ملف مرتبط بمهمة
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
     * الدالة الأساسية للحصول على جميع نسخ ملف
     */
    private async getAllVersions(criteria: any): Promise<any[]> {
        const versions = await this.fileVersionModel.find(criteria)
            .sort({ version: -1 })
            .exec();

        return versions.map(version => ({
            fileUrl: version.fileUrl,
            version: version.version,
            createdAt: (version as any).createdAt
        }));
    }

    /**
     * الحصول على أحدث نسخة من ملف مرتبط بقسم
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
     * الحصول على أحدث نسخة من ملف مرتبط بموظف
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
     * الحصول على أحدث نسخة من ملف مرتبط بمهمة
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
     * الدالة الأساسية للحصول على أحدث نسخة من ملف
     */
    private async getLatestVersion(criteria: any): Promise<string | null> {
        const latestVersion = await this.fileVersionModel.findOne(criteria)
            .sort({ version: -1 })
            .exec();

        return latestVersion ? latestVersion.fileUrl : null;
    }
}