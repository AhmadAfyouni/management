import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { CreateEmpDto } from './dto/create-emp.dto';
import { GetEmpDto } from './dto/get-emp.dto';
import { Emp, EmpDocument } from './schemas/emp.schema';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateEmpDto } from './dto/update-emp.dto';
import { JobTitlesService } from '../job-titles/job-titles.service';
import { UserRole } from 'src/config/role.enum';
import { ConflictException } from '@nestjs/common/exceptions';
import { parseObject } from 'src/helper/parse-object';
import { DepartmentService } from '../department/depratment.service';
import { FileService } from '../file-manager/file-manager.service';
import { PaginationService } from 'src/common/services/pagination.service';
import { PaginatedResult, PaginationOptions } from 'src/common/interfaces/pagination.interface';
import { SectionService } from '../section/section.service';

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
        @Inject(forwardRef(() => JobTitlesService))
        private readonly jobTitleService: JobTitlesService,
        @Inject(forwardRef(() => DepartmentService))
        private readonly departmentService: DepartmentService,
        private readonly fileService: FileService, // Using fixed FileService
        private readonly paginationService: PaginationService,
        private readonly sectionService: SectionService,
    ) { }

    async getAllEmp(options: PaginationOptions = {}): Promise<PaginatedResult<GetEmpDto>> {
        try {
            const populateOptions = [
                {
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory"
                    }
                },
                {
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: "parent_department_id",
                        model: "Department"
                    }
                }
            ];

            const filter: any = {};
            if (options.search) {
                filter['$or'] = [
                    { name: { $regex: options.search, $options: 'i' } },
                    { email: { $regex: options.search, $options: 'i' } },
                    { phone: { $regex: options.search, $options: 'i' } }
                ];
            }

            const paginatedResult = await this.paginationService.paginateWithPopulate<any>(
                this.empModel,
                options,
                filter,
                populateOptions
            );

            return {
                data: paginatedResult.data.map(emp => new GetEmpDto(emp)),
                meta: paginatedResult.meta
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch employees', error.message);
        }
    }

    async getEmpByJobTitle(jobId: string): Promise<EmpDocument[] | null> {
        return await this.empModel.find({ job_id: jobId }).lean().exec();
    }

    async findManagerByDepartment(departmentId: string): Promise<EmpDocument | null> {
        let manager;
        const jobTitleDoc = await this.jobTitleService.findByDepartmentId(departmentId);

        if (jobTitleDoc) {
            manager = await this.empModel.findOne({ job_id: jobTitleDoc._id.toString() }).exec();
        }
        return manager;
    }

    async getAllDeptEmp(departmentIds: string[]): Promise<{ [departmentName: string]: GetEmpDto[] }> {
        try {
            const emps = await this.empModel
                .find({ department_id: { $in: departmentIds } })
                .populate({
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory"
                    }
                })
                .populate({
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: "parent_department_id",
                        model: "Department"
                    }
                })
                .lean()
                .exec();

            const groupedEmps = emps.reduce((acc, emp) => {
                const departmentName = (emp as any).department_id.name;
                if (!acc[departmentName]) {
                    acc[departmentName] = [];
                }
                acc[departmentName].push(new GetEmpDto(emp));
                return acc;
            }, {} as { [departmentName: string]: GetEmpDto[] });

            return groupedEmps;
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch employees', error.message);
        }
    }

    // Helper function to extract filename from URL
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

    async createEmp(employee: CreateEmpDto): Promise<Emp | null> {
        try {
            const existingEmp = await this.empModel.findOne({
                $or: [{ email: employee.email }, { phone: employee.phone }],
            });
            if (existingEmp) {
                throw new ConflictException(
                    'Employee with this email or phone already exists.',
                );
            }

            // تحديد الدور (PRIMARY_USER أو SECONDARY_USER)
            const jobTitle = await this.jobTitleService.findOne(employee.job_id.toString());
            let role: UserRole = UserRole.SECONDARY_USER;

            if (jobTitle?.is_manager) {
                const alreadyManager = await this.empModel.findOne({
                    job_id: employee.job_id.toString(),
                });

                if (alreadyManager) {
                    throw new ConflictException(
                        "A user with this job title already exists. You cannot assign the same job title to multiple users.",
                    );

                }

                role = UserRole.PRIMARY_USER;
            }

            const hashedNewPassword = await bcrypt.hash(employee.password, 10);
            employee.password = hashedNewPassword;

            let manager;
            manager = await this.findManagerByDepartment(employee.department_id.toString());
            if (!manager) {
                const managerParent = await this.departmentService.findById(employee.department_id.toString());
                if (managerParent?.parent_department?._id) {
                    manager = await this.findManagerByDepartment(managerParent.parent_department._id.toString());
                }
            }

            // Create employee with empty certifications and documents first
            const emp = new this.empModel({
                ...employee,
                role,
                parentId: manager ? manager._id.toString() : null,
                certifications: [],
                legal_documents: []
            });

            const savedEmp = await emp.save();
            const empId = savedEmp._id.toString();

            // Process certifications and add with fileId references
            if (employee.certifications && employee.certifications.length > 0) {
                for (const certification of employee.certifications) {
                    if (certification.file) {
                        // Create file and get fileId
                        const fileName = this.extractFileNameFromUrl(certification.file);
                        const fileResult = await this.fileService.uploadFile({
                            fileUrl: certification.file,
                            originalName: fileName,
                            entityType: 'employee',
                            entityId: empId,
                            fileType: 'certification',
                            description: `Certification: ${certification.certificate_name}`,
                            createdBy: empId
                        });

                        // Add certification with fileId to employee
                        await this.empModel.updateOne(
                            { _id: empId },
                            {
                                $push: {
                                    certifications: {
                                        ...certification,
                                        fileId: new Types.ObjectId(fileResult.fileId)
                                    }
                                }
                            }
                        );
                    } else {
                        // Add certification without fileId
                        await this.empModel.updateOne(
                            { _id: empId },
                            { $push: { certifications: certification } }
                        );
                    }
                }
            }

            // Process legal documents and add with fileId references
            if (employee.legal_documents && employee.legal_documents.length > 0) {
                for (const document of employee.legal_documents) {
                    if (document.file) {
                        // Create file and get fileId
                        const fileName = this.extractFileNameFromUrl(document.file);
                        const fileResult = await this.fileService.uploadFile({
                            fileUrl: document.file,
                            originalName: fileName,
                            entityType: 'employee',
                            entityId: empId,
                            fileType: 'legal_document',
                            description: `Legal Document: ${document.name}`,
                            createdBy: empId
                        });

                        // Add document with fileId to employee
                        await this.empModel.updateOne(
                            { _id: empId },
                            {
                                $push: {
                                    legal_documents: {
                                        ...document,
                                        fileId: new Types.ObjectId(fileResult.fileId)
                                    }
                                }
                            }
                        );
                    } else {
                        // Add document without fileId
                        await this.empModel.updateOne(
                            { _id: empId },
                            { $push: { legal_documents: document } }
                        );
                    }
                }
            }


            // create initial section for this employee
            await this.sectionService.createInitialSections(empId);
            // Return the updated employee with populated file data

            return await this.empModel.findById(empId)
                .populate({
                    path: "job_id",
                    model: "JobTitles"
                })
                .populate({
                    path: "department_id",
                    model: "Department"
                })
                .populate({
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .populate({
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .exec();
        } catch (error) {
            console.error('Error creating employee:', error);
            throw new InternalServerErrorException(
                error.message,
            );
        }
    }

    async updateEmp(id: string, updateEmpDto: UpdateEmpDto) {
        try {
            const empExist = await this.empModel.findById(id);
            if (!empExist) {
                throw new NotFoundException('Employee not found');
            }

            if (updateEmpDto.password) {
                const hashedNewPassword = await bcrypt.hash(updateEmpDto.password, 10);
                updateEmpDto.password = hashedNewPassword;
            }

            // Handle certifications updates with fileId
            if (updateEmpDto.certifications && updateEmpDto.certifications.length > 0) {
                const existingCertifications = empExist.certifications || [];

                // Create a copy of existing certifications to work with
                const updatedCertifications = [...existingCertifications];

                for (const newCert of updateEmpDto.certifications) {
                    // Find existing certification by name
                    const existingIndex = updatedCertifications.findIndex(
                        c => c.certificate_name === newCert.certificate_name
                    );

                    if (existingIndex === -1) {
                        // New certification
                        let certToAdd = { ...newCert };

                        // Process file if present
                        if (newCert.file) {
                            const fileName = this.extractFileNameFromUrl(newCert.file);
                            const fileResult = await this.fileService.uploadFile({
                                fileUrl: newCert.file,
                                originalName: fileName,
                                entityType: 'employee',
                                entityId: id,
                                fileType: 'certification',
                                description: `Certification: ${newCert.certificate_name}`,
                                createdBy: id
                            });

                            certToAdd.fileId = new Types.ObjectId(fileResult.fileId);
                        }

                        // Add to array
                        updatedCertifications.push(certToAdd);
                    } else {
                        // Update existing certification
                        const existingCert = updatedCertifications[existingIndex];

                        // Update basic fields
                        updatedCertifications[existingIndex] = {
                            ...existingCert,
                            ...newCert
                        };

                        // Process file if changed
                        if (newCert.file && newCert.file !== existingCert.file) {
                            const fileName = this.extractFileNameFromUrl(newCert.file);

                            if (existingCert.fileId) {
                                // Update existing file with new version
                                await this.fileService.uploadFile({
                                    fileUrl: newCert.file,
                                    originalName: fileName,
                                    entityType: 'employee',
                                    entityId: id,
                                    fileType: 'certification',
                                    description: `Certification: ${newCert.certificate_name}`,
                                    createdBy: id
                                });
                            } else {
                                // Create new file
                                const fileResult = await this.fileService.uploadFile({
                                    fileUrl: newCert.file,
                                    originalName: fileName,
                                    entityType: 'employee',
                                    entityId: id,
                                    fileType: 'certification',
                                    description: `Certification: ${newCert.certificate_name}`,
                                    createdBy: id
                                });

                                updatedCertifications[existingIndex].fileId = new Types.ObjectId(fileResult.fileId);
                            }
                        }
                    }
                }

                // Replace certifications in the update DTO
                updateEmpDto.certifications = updatedCertifications;
            }

            // Handle legal documents updates with fileId
            if (updateEmpDto.legal_documents && updateEmpDto.legal_documents.length > 0) {
                const existingDocs = empExist.legal_documents || [];

                // Create a copy of existing documents to work with
                const updatedDocs = [...existingDocs];

                for (const newDoc of updateEmpDto.legal_documents) {
                    // Find existing document by name
                    const existingIndex = updatedDocs.findIndex(
                        d => d.name === newDoc.name
                    );

                    if (existingIndex === -1) {
                        // New document
                        let docToAdd = { ...newDoc };

                        // Process file if present
                        if (newDoc.file) {
                            const fileName = this.extractFileNameFromUrl(newDoc.file);
                            const fileResult = await this.fileService.uploadFile({
                                fileUrl: newDoc.file,
                                originalName: fileName,
                                entityType: 'employee',
                                entityId: id,
                                fileType: 'legal_document',
                                description: `Legal Document: ${newDoc.name}`,
                                createdBy: id
                            });

                            docToAdd.fileId = new Types.ObjectId(fileResult.fileId);
                        }

                        // Add to array
                        updatedDocs.push(docToAdd);
                    } else {
                        // Update existing document
                        const existingDoc = updatedDocs[existingIndex];

                        // Update basic fields
                        updatedDocs[existingIndex] = {
                            ...existingDoc,
                            ...newDoc
                        };

                        // Process file if changed
                        if (newDoc.file && newDoc.file !== existingDoc.file) {
                            const fileName = this.extractFileNameFromUrl(newDoc.file);

                            if (existingDoc.fileId) {
                                // Update existing file with new version
                                await this.fileService.uploadFile({
                                    fileUrl: newDoc.file,
                                    originalName: fileName,
                                    entityType: 'employee',
                                    entityId: id,
                                    fileType: 'legal_document',
                                    description: `Legal Document: ${newDoc.name}`,
                                    createdBy: id
                                });
                            } else {
                                // Create new file
                                const fileResult = await this.fileService.uploadFile({
                                    fileUrl: newDoc.file,
                                    originalName: fileName,
                                    entityType: 'employee',
                                    entityId: id,
                                    fileType: 'legal_document',
                                    description: `Legal Document: ${newDoc.name}`,
                                    createdBy: id
                                });

                                updatedDocs[existingIndex].fileId = new Types.ObjectId(fileResult.fileId);
                            }
                        }
                    }
                }

                // Replace legal_documents in the update DTO
                updateEmpDto.legal_documents = updatedDocs;
            }

            // Update employee with populated references
            return await this.empModel.findByIdAndUpdate(
                id,
                updateEmpDto,
                { runValidators: true, new: true }
            )
                .populate({
                    path: "job_id",
                    model: "JobTitles"
                })
                .populate({
                    path: "department_id",
                    model: "Department"
                })
                .populate({
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .populate({
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .exec();
        } catch (error) {
            throw new InternalServerErrorException('Failed to update employee', error.message);
        }
    }
    /**
     * إضافة شهادة جديدة للموظف
     */
    async addCertification(empId: string, certificationData: any): Promise<any> {
        try {
            const emp = await this.empModel.findById(empId).exec();
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            // إذا كان هناك ملف، قم بإنشاء نسخة له
            if (certificationData.file) {
                const fileName = this.extractFileNameFromUrl(certificationData.file);
                await this.fileService.uploadFile({
                    fileUrl: certificationData.file,
                    originalName: fileName,
                    entityType: 'employee',
                    entityId: empId,
                    fileType: 'certification',
                    description: `Certification: ${certificationData.certificate_name}`,
                    createdBy: empId
                });
            }

            // إضافة الشهادة للموظف
            emp.certifications.push(certificationData);
            await emp.save();

            return {
                success: true,
                message: 'تمت إضافة الشهادة بنجاح',
                data: emp.certifications[emp.certifications.length - 1]
            };
        } catch (error) {
            console.error('خطأ في إضافة الشهادة:', error);
            throw error;
        }
    }

    /**
     * تحديث شهادة للموظف
     */
    async updateCertification(empId: string, certIndex: number, certificationData: any): Promise<any> {
        try {
            const emp = await this.empModel.findById(empId).exec();
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            if (certIndex < 0 || certIndex >= emp.certifications.length) {
                throw new Error('رقم الشهادة غير صحيح');
            }

            const oldCertification = emp.certifications[certIndex];

            // إذا كان ملف الشهادة قد تغير، قم بإنشاء نسخة جديدة
            if (certificationData.file && certificationData.file !== oldCertification.file) {
                const fileName = this.extractFileNameFromUrl(certificationData.file);
                await this.fileService.uploadFile({
                    fileUrl: certificationData.file,
                    originalName: fileName,
                    entityType: 'employee',
                    entityId: empId,
                    fileType: 'certification',
                    description: `Certification: ${certificationData.certificate_name || oldCertification.certificate_name}`,
                    createdBy: empId
                });
            }

            // تحديث الشهادة
            emp.certifications[certIndex] = {
                ...oldCertification,
                ...certificationData
            };

            await emp.save();

            return {
                success: true,
                message: 'تم تحديث الشهادة بنجاح',
                data: emp.certifications[certIndex]
            };
        } catch (error) {
            console.error('خطأ في تحديث الشهادة:', error);
            throw error;
        }
    }

    /**
     * إضافة وثيقة قانونية جديدة للموظف
     */
    async addLegalDocument(empId: string, documentData: any): Promise<any> {
        try {
            const emp = await this.empModel.findById(empId).exec();
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            // إذا كان هناك ملف، قم بإنشاء نسخة له
            if (documentData.file) {
                const fileName = this.extractFileNameFromUrl(documentData.file);
                await this.fileService.uploadFile({
                    fileUrl: documentData.file,
                    originalName: fileName,
                    entityType: 'employee',
                    entityId: empId,
                    fileType: 'legal_document',
                    description: `Legal Document: ${documentData.name}`,
                    createdBy: empId
                });
            }

            // إضافة الوثيقة للموظف
            emp.legal_documents.push(documentData);
            await emp.save();

            return {
                success: true,
                message: 'تمت إضافة الوثيقة القانونية بنجاح',
                data: emp.legal_documents[emp.legal_documents.length - 1]
            };
        } catch (error) {
            console.error('خطأ في إضافة الوثيقة القانونية:', error);
            throw error;
        }
    }

    /**
     * تحديث وثيقة قانونية للموظف
     */
    async updateLegalDocument(empId: string, docIndex: number, documentData: any): Promise<any> {
        try {
            const emp = await this.empModel.findById(empId).exec();
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            if (docIndex < 0 || docIndex >= emp.legal_documents.length) {
                throw new Error('رقم الوثيقة غير صحيح');
            }

            const oldDocument = emp.legal_documents[docIndex];

            // إذا كان ملف الوثيقة قد تغير، قم بإنشاء نسخة جديدة
            if (documentData.file && documentData.file !== oldDocument.file) {
                const fileName = this.extractFileNameFromUrl(documentData.file);
                await this.fileService.uploadFile({
                    fileUrl: documentData.file,
                    originalName: fileName,
                    entityType: 'employee',
                    entityId: empId,
                    fileType: 'legal_document',
                    description: `Legal Document: ${documentData.name || oldDocument.name}`,
                    createdBy: empId
                });
            }

            // تحديث الوثيقة
            emp.legal_documents[docIndex] = {
                ...oldDocument,
                ...documentData
            };

            await emp.save();

            return {
                success: true,
                message: 'تم تحديث الوثيقة القانونية بنجاح',
                data: emp.legal_documents[docIndex]
            };
        } catch (error) {
            console.error('خطأ في تحديث الوثيقة القانونية:', error);
            throw error;
        }
    }

    /**
     * الحصول على جميع نسخ ملف شهادة
     */
    async getCertificationFileVersions(empId: string, certificationName: string): Promise<any[]> {
        try {
            // Get all certification files by entity
            const files = await this.fileService.getFilesByEntity(
                'employee',
                empId,
                'certification'
            );

            // Filter files by the certification name in the description
            return files.filter(file =>
                file.description &&
                file.description.includes(`Certification: ${certificationName}`)
            );
        } catch (error) {
            console.error('Error getting certification file versions:', error);
            return [];
        }
    }

    /**
     * الحصول على جميع نسخ ملف وثيقة قانونية
     */
    async getLegalDocumentFileVersions(empId: string, documentName: string): Promise<any[]> {
        try {
            // Get all legal document files by entity
            const files = await this.fileService.getFilesByEntity(
                'employee',
                empId,
                'legal_document'
            );

            // Filter files by the document name in the description
            return files.filter(file =>
                file.description &&
                file.description.includes(`Legal Document: ${documentName}`)
            );
        } catch (error) {
            console.error('Error getting legal document file versions:', error);
            return [];
        }
    }




    async findByEmail(email: string): Promise<EmpDocument | null> {
        try {
            const emp = await this.empModel.findOne({ email: email })
                .populate({
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory"
                    }
                })
                .populate({
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: "parent_department_id",
                        model: "Department"
                    }
                })
                // Add fileId populations
                .populate({
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .populate({
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .lean()
                .exec();
            if (emp) {
                return emp;
            }
            return null;
        } catch (error) {
            throw new InternalServerErrorException('Failed to find employee by email', error.message);
        }
    }

    async findByIdWithRolesAndPermissions(id: string): Promise<Emp | null> {
        try {
            const emp = await this.empModel.findById(id)
                .populate({
                    path: "job_id",
                    model: "JobTitles"
                })
                .populate({
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: "parent_department_id",
                        model: "Department"
                    }
                })
                .populate({
                    path: 'roles',
                    populate: {
                        path: 'permissions',
                        model: 'Permission'
                    }
                })
                .populate({
                    path: "supervisor_id",
                    model: "Emp"
                })
                // Add fileId populations
                .populate({
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .populate({
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .exec();

            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            return emp;
        } catch (error) {
            throw new InternalServerErrorException('Failed to find employee by ID with roles and permissions', error.message);
        }
    }


    async findById(id: string): Promise<EmpDocument | null> {
        try {
            const emp = await this.empModel.findById(id)
                .populate({
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory"
                    }
                })
                .populate({
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: "parent_department_id",
                        model: "Department"
                    }
                })
                // Add fileId populations
                .populate({
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .populate({
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .lean()
                .exec();
            return emp;
        } catch (error) {
            throw new InternalServerErrorException('Failed to find employee by ID', error.message);
        }
    }

    async findDepartmentIdByEmpId(id: string) {
        try {
            const emp = await this.empModel.findById(parseObject(id)).lean().exec();
            return emp?.department_id.toString();
        } catch (error) {
            throw new InternalServerErrorException('Failed to find employee by ID', error.message);
        }
    }



    async needsPasswordChange(empId: string): Promise<boolean> {
        try {
            const emp = await this.empModel.findById(empId).exec();
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }
            return !emp.changed_password;
        } catch (error) {
            throw new InternalServerErrorException('Failed to check password change status', error.message);
        }
    }

    async updatePassword(empId: string, updatePasswordDto: UpdatePasswordDto): Promise<void> {
        try {
            const emp = await this.empModel.findById(empId).exec();
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }
            const hashedNewPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
            emp.password = hashedNewPassword;
            emp.changed_password = true;
            await emp.save();
        } catch (error) {
            throw new InternalServerErrorException('Failed to update password', error.message);
        }
    }

    async getEmpByDepartment(depId: string): Promise<GetEmpDto[]> {
        try {
            const emps = await this.empModel.find({ department_id: depId })
                .populate({
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory"
                    }
                })
                .populate({
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: "parent_department_id",
                        model: "Department"
                    }
                })
                // Add fileId populations
                .populate({
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .populate({
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                })
                .lean()
                .exec();
            return emps.map(emp => new GetEmpDto(emp));
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch employees by department', error.message);
        }
    }


    async getMyEmp(deptId: string) {
        return await this.empModel.find({ department_id: deptId })
            .populate("certifications.fileId")
            .populate("legal_documents.fileId")
            .exec();
    }
    async buildEmployeeTree(id: string, start: boolean = true): Promise<{ tree: any[], info: any[] }> {
        let allEmployees: any[] = [];
        let info: any[] = [];
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid Employee ID');
        }
        const employee = await this.empModel
            .findById(new Types.ObjectId(id))
            .populate([
                {
                    path: 'job_id',
                    model: "JobTitles",
                    populate: {
                        path: 'category',
                        model: "JobCategory"
                    }
                },
                {
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: 'parent_department_id',
                        model: "Department"
                    }
                },
                // Add fileId populations
                {
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                },
                {
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                }
            ])
            .lean()
            .exec() as any;

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }
        if (start) {
            allEmployees.push({
                id: employee._id.toString(),
                name: employee.name,
                parentId: employee.parentId || null,
                is_manager: employee.role === UserRole.PRIMARY_USER || employee.role === UserRole.ADMIN,
                title: employee.job_id.title,
                department: employee.department_id.name,
                departmentId: employee.department_id._id.toString(),
            });
            info.push(new GetEmpDto(employee));
        }
        if (employee.role == UserRole.ADMIN) {
            allEmployees = [];
            info = [];
            const emps = await this.empModel.find({}).populate([
                {
                    path: 'job_id',
                    model: "JobTitles",
                    populate: {
                        path: 'category',
                        model: "JobCategory"
                    }
                },
                {
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: 'parent_department_id',
                        model: "Department"
                    }
                },
                // Add fileId populations
                {
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                },
                {
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                }
            ]).lean().exec() as any;
            emps.map((emp) => {
                allEmployees.push({
                    id: emp._id.toString(),
                    name: emp.name,
                    parentId: emp.parentId || null,
                    is_manager: emp.role === UserRole.PRIMARY_USER || emp.role === UserRole.ADMIN,
                    title: emp.job_id.title,
                    department: emp.department_id.name
                });
                info.push(new GetEmpDto(emp));
            });
            return { tree: allEmployees, info };
        }
        if (employee.role == UserRole.SECONDARY_USER) {
            return { tree: [], info: [] };
        }

        const directReports = await this.empModel
            .find({ parentId: employee._id.toString() })
            .populate([
                {
                    path: 'job_id',
                    model: "JobTitles",
                    populate: {
                        path: 'category',
                        model: "JobCategory"
                    }
                },
                {
                    path: "department_id",
                    model: "Department",
                    populate: {
                        path: 'parent_department_id',
                        model: "Department"
                    }
                },
                // Add fileId populations
                {
                    path: "certifications.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                },
                {
                    path: "legal_documents.fileId",
                    model: "File",
                    populate: {
                        path: "currentVersion"
                    }
                }
            ])
            .exec() as any;
        const directReportsDto = directReports.map((report) => {
            info.push(new GetEmpDto(report));
            return {
                id: report._id.toString(),
                name: report.name,
                parentId: report.parentId || null,
                is_manager: report.role === UserRole.PRIMARY_USER || report.role === UserRole.ADMIN,
                title: report.job_id.title,
                department: report.department_id.name,
                departmentId: report.department_id._id.toString(),
            }
        });

        allEmployees.push(...directReportsDto);
        for (const report of directReports) {
            if (report._id.toString() !== employee._id.toString()) {
                const subTree = await (await this.buildEmployeeTree(report._id.toString(), false)).tree;
                allEmployees.push(...subTree);
            }
        }
        return { tree: allEmployees, info: info };
    }
}