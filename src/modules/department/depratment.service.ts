import { forwardRef, Injectable, InternalServerErrorException, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DepartmentDocument } from './schema/department.schema';
import { GetDepartmentDto } from './dto/get-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { EmpService } from '../emp/emp.service';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { PaginationService } from 'src/common/services/pagination.service';
import { PaginatedResult, PaginationOptions } from 'src/common/interfaces/pagination.interface';
import { FileService } from '../file-manager/file-manager.service';

@Injectable()
export class DepartmentService {

    constructor(
        @InjectModel("Department") private readonly departmentModel: Model<DepartmentDocument>,
        @Inject(forwardRef(() => EmpService))
        private readonly empService: EmpService,
        private configService: ConfigService,
        private readonly notificationService: NotificationService,
        private readonly fileService: FileService,
        private readonly paginationService: PaginationService,
    ) { }

    async getAllDepts(options: PaginationOptions = {}): Promise<PaginatedResult<GetDepartmentDto>> {
        const paginatedResult = await this.paginationService.paginate(
            this.departmentModel,
            options,
            {},
            'parent_department_id'
        );

        return {
            data: paginatedResult.data.map(dept => new GetDepartmentDto(dept)),
            meta: paginatedResult.meta
        };
    }



    async createDepartment(deptDto: CreateDepartmentDto, empId: string): Promise<any> {
        try {
            const { parent_department_id, supportingFiles, requiredReports, developmentPrograms, ...rest } = deptDto;

            // Create the department first
            const dept = new this.departmentModel({
                ...rest,
                parent_department_id: parent_department_id ? new Types.ObjectId(parent_department_id) : undefined,
                supportingFiles: [],
                requiredReports: [],
                developmentPrograms: []
            });

            await dept.save();
            const departmentId = dept._id.toString();

            // Process supporting files
            if (supportingFiles && supportingFiles.length > 0) {
                let fileIds: Types.ObjectId[] = [];
                for (const fileUrl of supportingFiles) {
                    // Process new file URL
                    const fileName = this.extractFileNameFromUrl(fileUrl);
                    const fileResult = await this.fileService.uploadFile({
                        fileUrl,
                        originalName: fileName,
                        entityType: 'department',
                        entityId: departmentId,
                        fileType: 'supporting',  // Explicitly set file type
                        createdBy: empId
                    });
                    const o = new Types.ObjectId(fileResult.fileId);
                    fileIds.push(o);
                }
                dept.supportingFiles = fileIds;
            }

            // Process required reports
            if (requiredReports && requiredReports.length > 0) {
                const processedReports = await Promise.all(
                    requiredReports.map(async (report: any) => {
                        if (report.templateFile) {
                            // Skip if it's already a MongoDB ID (already processed file)
                            if (this.isMongoId(report.templateFile)) {
                                return {
                                    name: report.name,
                                    templateFileId: new Types.ObjectId(report.templateFile)
                                };
                            }

                            // Process new file URL
                            const fileName = this.extractFileNameFromUrl(report.templateFile);
                            const fileResult = await this.fileService.uploadFile({
                                fileUrl: report.templateFile,
                                originalName: fileName,
                                entityType: 'department',
                                entityId: departmentId,
                                fileType: 'template',  // Explicitly set file type
                                description: `Template for ${report.name}`,
                                createdBy: empId
                            });
                            return {
                                name: report.name,
                                templateFileId: new Types.ObjectId(fileResult.fileId)
                            };
                        }
                        return null;
                    })
                );
                // Filter out null values before assigning
                const validReports = processedReports.filter((report): report is { name: string; templateFileId: Types.ObjectId } =>
                    report !== null
                );
                dept.requiredReports = validReports;
            }

            // Process development programs
            if (developmentPrograms && developmentPrograms.length > 0) {
                const processedPrograms = await Promise.all(
                    developmentPrograms.map(async (program: any) => {
                        const result: {
                            programName: string;
                            objective: string;
                            notes: string | null;
                            programFileId?: Types.ObjectId;
                        } = {
                            programName: program.programName,
                            objective: program.objective,
                            notes: program.notes || null
                        };

                        if (program.programFile) {
                            // Skip if it's already a MongoDB ID (already processed file)
                            if (this.isMongoId(program.programFile)) {
                                result.programFileId = new Types.ObjectId(program.programFile);
                            } else {
                                // Process new file URL
                                const fileName = this.extractFileNameFromUrl(program.programFile);
                                const fileResult = await this.fileService.uploadFile({
                                    fileUrl: program.programFile,
                                    originalName: fileName,
                                    entityType: 'department',
                                    entityId: departmentId,
                                    fileType: 'program',  // Explicitly set file type
                                    description: `Program for ${program.programName}`,
                                    createdBy: empId
                                });
                                result.programFileId = new Types.ObjectId(fileResult.fileId);
                            }
                        }

                        return result;
                    })
                );
                dept.developmentPrograms = processedPrograms as any;
            }

            await dept.save();

            const updatedDept = await this.populateDepartment(departmentId);
            await this.notificationService.notifyDepartmentCreated(updatedDept!, empId);

            return {
                message: "تم إنشاء القسم بنجاح مع الملفات",
                status: true,
                department: new GetDepartmentDto(updatedDept)
            };
        } catch (error) {
            console.error("خطأ في إنشاء القسم مع الملفات:", error);
            return { message: error.message, status: false };
        }
    }

    // Helper method to populate all file-related data in a department
    private async populateDepartment(departmentId: string): Promise<DepartmentDocument | null> {
        return this.departmentModel.findById(departmentId)
            .populate({
                path: 'supportingFiles',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'requiredReports.templateFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'developmentPrograms.programFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .exec();
    }

    // Alias to maintain backward compatibility
    async createDeptWithFiles(deptDto: CreateDepartmentDto, empId: string): Promise<any> {
        return this.createDepartment(deptDto, empId);
    }

    private extractFileNameFromUrl(url: string): string {
        if (!url) return 'unnamed_file';

        try {
            const urlParts = url.split('/');
            return urlParts[urlParts.length - 1];
        } catch (error) {
            console.error("Error extracting filename from URL:", error);
            return 'unnamed_file';
        }
    }
    private isMongoId(str: string): boolean {
        return /^[0-9a-fA-F]{24}$/.test(str);
    }

    async findByName(name: string): Promise<GetDepartmentDto | null> {
        const dept = await this.departmentModel.findOne({ name })
            .populate({
                path: 'supportingFiles',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'requiredReports.templateFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'developmentPrograms.programFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .exec();
        return dept ? new GetDepartmentDto(dept) : null;
    }

    async findById(id: string): Promise<GetDepartmentDto | null> {
        const dept = await this.populateDepartment(id);
        return dept ? new GetDepartmentDto(dept) : null;
    }

    async findSubDepartments(): Promise<GetDepartmentDto[]> {
        try {
            const departments = await this.departmentModel.find({
                parent_department_id: { $ne: null }
            })
                .populate({
                    path: 'supportingFiles',
                    populate: {
                        path: 'currentVersion'
                    }
                })
                .populate({
                    path: 'requiredReports.templateFileId',
                    populate: {
                        path: 'currentVersion'
                    }
                })
                .populate({
                    path: 'developmentPrograms.programFileId',
                    populate: {
                        path: 'currentVersion'
                    }
                })
                .exec();
            return departments.map(dept => new GetDepartmentDto(dept));
        } catch (error) {
            console.error('Error finding departments with non-null parent_department_id:', error);
            throw new InternalServerErrorException('Failed to find departments with non-null parent_department_id');
        }
    }

    async updateDept(id: string, deptDto: UpdateDepartmentDto, empId?: string): Promise<any> {
        try {
            const { parent_department_id, supportingFiles, requiredReports, developmentPrograms, ...rest } = deptDto;

            const existingDept = await this.departmentModel.findById(id).exec();
            if (!existingDept) {
                throw new NotFoundException(`لم يتم العثور على قسم بالمعرف ${id}`);
            }

            // Process supporting files
            if (supportingFiles && supportingFiles.length > 0) {
                const fileIds = [...(existingDept.supportingFiles || []).map(id =>
                    typeof id === 'object' && id !== null ? id.toString() : id
                )];

                for (const fileUrl of supportingFiles) {
                    // Skip if it's already in our list
                    if (fileIds.includes(fileUrl)) {
                        continue;
                    }

                    // Check if it's a MongoDB ID or a new file URL
                    if (this.isMongoId(fileUrl)) {
                        fileIds.push(fileUrl);
                    } else {
                        // This is a new file URL
                        const fileName = this.extractFileNameFromUrl(fileUrl);
                        const fileResult = await this.fileService.uploadFile({
                            fileUrl,
                            originalName: fileName,
                            entityType: 'department',
                            entityId: id,
                            fileType: 'supporting',
                            createdBy: empId
                        });
                        fileIds.push(fileResult.fileId);
                    }
                }

                existingDept.supportingFiles = fileIds.map(fileId => new Types.ObjectId(fileId));
            }

            // Process required reports
            if (requiredReports && requiredReports.length > 0) {
                const processedReports = await Promise.all(
                    requiredReports.map(async (report: any) => {
                        // Find existing report with the same name
                        const existingReport = existingDept.requiredReports?.find(r => r.name === report.name);

                        if (report.templateFile) {
                            // Check if this is a file ID reference or a new file URL
                            if (this.isMongoId(report.templateFile)) {
                                return {
                                    name: report.name,
                                    templateFileId: new Types.ObjectId(report.templateFile)
                                };
                            } else {
                                // This is a new file URL
                                const fileName = this.extractFileNameFromUrl(report.templateFile);
                                const fileResult = await this.fileService.uploadFile({
                                    fileUrl: report.templateFile,
                                    originalName: fileName,
                                    entityType: 'department',
                                    entityId: id,
                                    fileType: 'template',
                                    description: `Template for ${report.name}`,
                                    createdBy: empId
                                });
                                return {
                                    name: report.name,
                                    templateFileId: new Types.ObjectId(fileResult.fileId)
                                };
                            }
                        } else if (existingReport && existingReport.templateFileId) {
                            // Keep existing template file if no new one provided
                            return {
                                name: report.name,
                                templateFileId: existingReport.templateFileId
                            };
                        }

                        return null;
                    })
                );

                // Filter out null values before assigning
                const validReports = processedReports.filter((report): report is { name: string; templateFileId: Types.ObjectId } =>
                    report !== null
                );
                existingDept.requiredReports = validReports;
            }

            // Process development programs
            if (developmentPrograms && developmentPrograms.length > 0) {
                const processedPrograms = await Promise.all(
                    developmentPrograms.map(async (program: any) => {
                        const existingProgram = existingDept.developmentPrograms?.find(
                            p => p.programName === program.programName
                        );

                        const result: {
                            programName: string;
                            objective: string;
                            notes: string | null;
                            programFileId?: Types.ObjectId;
                        } = {
                            programName: program.programName,
                            objective: program.objective,
                            notes: program.notes || null
                        };

                        if (program.programFile) {
                            // Check if this is a file ID reference or a new file URL
                            if (this.isMongoId(program.programFile)) {
                                result.programFileId = new Types.ObjectId(program.programFile);
                            } else {
                                // This is a new file URL
                                const fileName = this.extractFileNameFromUrl(program.programFile);
                                const fileResult = await this.fileService.uploadFile({
                                    fileUrl: program.programFile,
                                    originalName: fileName,
                                    entityType: 'department',
                                    entityId: id,
                                    fileType: 'program',
                                    description: `Program for ${program.programName}`,
                                    createdBy: empId
                                });
                                result.programFileId = new Types.ObjectId(fileResult.fileId);
                            }
                        } else if (existingProgram && existingProgram.programFileId) {
                            // Keep existing program file if no new one provided
                            result.programFileId = existingProgram.programFileId;
                        }

                        return result;
                    })
                );

                existingDept.developmentPrograms = processedPrograms as any;
            }

            // Update and save the department
            Object.assign(existingDept, {
                ...rest,
                parent_department_id: parent_department_id ? new Types.ObjectId(parent_department_id) : existingDept.parent_department_id
            });

            await existingDept.save();

            // Update parent-child relationship for managers if needed
            if (parent_department_id) {
                const manager = await this.empService.findManagerByDepartment(parent_department_id.toString());
                const manager2 = await this.empService.findManagerByDepartment(id);

                if (manager && manager2) {
                    manager2.parentId = manager._id.toString();
                    await manager2.save();
                }
            }

            const updatedDept = await this.populateDepartment(id);
            return new GetDepartmentDto(updatedDept!);
        } catch (error) {
            if (error.name === 'CastError' && error.kind === 'ObjectId') {
                throw new NotFoundException(`لم يتم العثور على قسم بالمعرف ${id}`);
            }
            throw new InternalServerErrorException('خطأ في تحديث القسم: ' + error.message);
        }
    }

    async getFileVersions(fileId: string): Promise<any[]> {
        return await this.fileService.getFileVersions(fileId);
    }

    private async getDepartmentWithSubDepartments(id: string): Promise<DepartmentDocument[]> {
        const department = await this.departmentModel.findById(id)
            .populate({
                path: 'supportingFiles',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'requiredReports.templateFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'developmentPrograms.programFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .exec();

        if (!department) {
            throw new NotFoundException(`Department with ID ${id} not found`);
        }

        const allSubDepartments: DepartmentDocument[] = [];

        const subDepartments = await this.departmentModel.find({ parent_department_id: id })
            .populate({
                path: 'supportingFiles',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'requiredReports.templateFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'developmentPrograms.programFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .exec();

        for (const subDept of subDepartments) {
            allSubDepartments.push(subDept, ...await this.getDepartmentWithSubDepartments(subDept._id.toString()));
        }

        return [department, ...allSubDepartments];
    }

    async viewAccessDepartment(ids: string[]): Promise<any[]> {
        const results: any[] = [];

        for (const id of ids) {
            const departments = await this.buildDepartmentTree(id);
            results.push(departments);
        }

        return results;
    }

    private async buildDepartmentTree(
        id: string,
        accessibleDepartments?: string[]
    ): Promise<{ tree: any[], info: any[] }> {
        const objectId = new Types.ObjectId(id);

        const department = await this.departmentModel.findById(objectId)
            .populate({
                path: 'supportingFiles',
                model: "File",
                populate: {
                    path: 'currentVersion',
                    model: "FileVersion"
                }
            })
            .populate({
                path: 'requiredReports.templateFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'developmentPrograms.programFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .exec();

        if (!department) {
            throw new NotFoundException(`Department with ID ${id} not found`);
        }

        let departmentList: any[] = [];
        let departmentInfoList: any[] = [];
        const emps = await this.empService.getEmpByDepartment(department._id.toString());
        const departmentDto = {
            id: department._id.toString(),
            name: department.name,
            parentId: department.parent_department_id?.toString()
                ? department.parent_department_id.toString()
                : null,
            emps: emps.map(emp => {
                return {
                    name: emp.name,
                    id: emp.id,
                    title: emp.job?.title
                }
            })
        };

        departmentList.push(departmentDto);
        departmentInfoList.push(new GetDepartmentDto(department));

        const subDepartments = await this.departmentModel
            .find({ parent_department_id: objectId })
            .populate("parent_department_id")
            .populate({
                path: 'supportingFiles',
                model: "File",
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'requiredReports.templateFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .populate({
                path: 'developmentPrograms.programFileId',
                populate: {
                    path: 'currentVersion'
                }
            })
            .exec();

        for (const subDept of subDepartments) {
            const subDepartmentList = await this.buildDepartmentTree(
                subDept._id.toString()
            );
            departmentList.push(...subDepartmentList.tree);
            departmentInfoList.push(...subDepartmentList.info);
        }

        if (accessibleDepartments && accessibleDepartments.length > 0) {
            for (const departmentId of accessibleDepartments) {
                const accessibleDepartmentList = await this.buildDepartmentTree(
                    departmentId
                );
                departmentList.push(...accessibleDepartmentList.tree);
                departmentInfoList.push(...accessibleDepartmentList.info);
            }
        }

        return { tree: departmentList, info: departmentInfoList };
    }

    async getDepartmentTree(departmentId: string, departments?: string[]): Promise<{ tree: any[], info: any[] }> {
        return await this.buildDepartmentTree(departmentId, departments);
    }

    async getMyLevelOne(departmentId: string) {
        let tree: any[];
        const objectId = new Types.ObjectId(departmentId);
        const department = await this.departmentModel.findById(objectId).exec();
        if (!department) {
            throw new NotFoundException(`Department with ID ${departmentId} not found`);
        }
        const subDepartment = await this.departmentModel.find({ parent_department_id: objectId }).lean().exec();
        const sub = subDepartment.map(dept => ({
            id: dept._id.toString(),
            name: dept.name
        }));
        sub.push({
            id: departmentId,
            name: department.name
        });
        return sub;
    }
}