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
import { FileVersionService } from '../file-version/file-version.service';

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
        @Inject(forwardRef(() => JobTitlesService))
        private readonly jobTitleService: JobTitlesService,
        @Inject(forwardRef(() => DepartmentService))
        private readonly departmentService: DepartmentService,
        private readonly fileVersionService: FileVersionService
    ) { }

    async getAllEmp(): Promise<GetEmpDto[]> {
        try {
            const emps = await this.empModel.find({}).populate({
                path: "job_id",
                model: "JobTitles",
                populate: {
                    path: "category",
                    model: "JobCategory"
                }
            }).populate({
                path: "department_id",
                model: "Department",
                populate: {
                    path: "parent_department_id",
                    model: "Department"
                }
            }).lean().exec();
            return emps.map(emp => new GetEmpDto(emp));
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
                        'Cannot create two primary users for that job title.',
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
                manager = await this.findManagerByDepartment(managerParent?.parent_department!._id.toString()!);
            }


            const emp = new this.empModel({
                ...employee,
                role,
                parentId: manager ? manager._id.toString() : null
            });

            const savedEmp = await emp.save();

            if (employee.certifications && employee.certifications.length > 0) {
                for (const certification of employee.certifications) {
                    if (certification.file) {
                        await this.fileVersionService.createEmployeeFileVersion(
                            certification.file,
                            savedEmp._id.toString(),
                            'certification',
                            'certification',
                            certification.certificate_name
                        );
                    }
                }
            }

            if (employee.legal_documents && employee.legal_documents.length > 0) {
                for (const document of employee.legal_documents) {
                    if (document.file) {
                        await this.fileVersionService.createEmployeeFileVersion(
                            document.file,
                            savedEmp._id.toString(),
                            'legal_document',
                            'legal_document',
                            document.name
                        );
                    }
                }
            }

            return savedEmp;
        } catch (error) {
            console.error('Error creating employee:', error);
            throw new InternalServerErrorException(
                'Failed to create employee',
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

            // معالجة تحديث الشهادات والوثائق القانونية إذا وجدت
            if (updateEmpDto.certifications && updateEmpDto.certifications.length > 0) {
                const existingCertifications = empExist.certifications || [];

                for (let i = 0; i < updateEmpDto.certifications.length; i++) {
                    const newCert = updateEmpDto.certifications[i];

                    // البحث عن الشهادة الموجودة بنفس الاسم
                    const existingCertIndex = existingCertifications.findIndex(
                        cert => cert.certificate_name === newCert.certificate_name
                    );

                    if (existingCertIndex === -1) {
                        // شهادة جديدة
                        if (newCert.file) {
                            await this.fileVersionService.createEmployeeFileVersion(
                                newCert.file,
                                id,
                                'certification',
                                'certification',
                                newCert.certificate_name
                            );
                        }
                    } else {
                        // تحديث شهادة موجودة
                        const existingCert = existingCertifications[existingCertIndex];
                        if (newCert.file && newCert.file !== existingCert.file) {
                            await this.fileVersionService.createEmployeeFileVersion(
                                newCert.file,
                                id,
                                'certification',
                                'certification',
                                newCert.certificate_name
                            );
                        }
                    }
                }
            }

            if (updateEmpDto.legal_documents && updateEmpDto.legal_documents.length > 0) {
                const existingDocs = empExist.legal_documents || [];

                for (let i = 0; i < updateEmpDto.legal_documents.length; i++) {
                    const newDoc = updateEmpDto.legal_documents[i];

                    // البحث عن الوثيقة الموجودة بنفس الاسم
                    const existingDocIndex = existingDocs.findIndex(
                        doc => doc.name === newDoc.name
                    );

                    if (existingDocIndex === -1) {
                        // وثيقة جديدة
                        if (newDoc.file) {
                            await this.fileVersionService.createEmployeeFileVersion(
                                newDoc.file,
                                id,
                                'legal_document',
                                'legal_document',
                                newDoc.name
                            );
                        }
                    } else {
                        // تحديث وثيقة موجودة
                        const existingDoc = existingDocs[existingDocIndex];
                        if (newDoc.file && newDoc.file !== existingDoc.file) {
                            await this.fileVersionService.createEmployeeFileVersion(
                                newDoc.file,
                                id,
                                'legal_document',
                                'legal_document',
                                newDoc.name
                            );
                        }
                    }
                }
            }

            return await this.empModel.findByIdAndUpdate(id, updateEmpDto, { runValidators: true, new: true }).exec();
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
                await this.fileVersionService.createEmployeeFileVersion(
                    certificationData.file,
                    empId,
                    'certification',
                    'certification',
                    certificationData.certificate_name
                );
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
                await this.fileVersionService.createEmployeeFileVersion(
                    certificationData.file,
                    empId,
                    'certification',
                    'certification',
                    certificationData.certificate_name || oldCertification.certificate_name
                );
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
                await this.fileVersionService.createEmployeeFileVersion(
                    documentData.file,
                    empId,
                    'legal_document',
                    'legal_document',
                    documentData.name
                );
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
                await this.fileVersionService.createEmployeeFileVersion(
                    documentData.file,
                    empId,
                    'legal_document',
                    'legal_document',
                    documentData.name || oldDocument.name
                );
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
    async getCertificationFileVersions(empId: string, certificationName: string, fileName: string): Promise<any[]> {
        return this.fileVersionService.getEmployeeFileVersions(
            fileName,
            empId,
            'certification',
            'certification',
            certificationName
        );
    }

    /**
     * الحصول على جميع نسخ ملف وثيقة قانونية
     */
    async getLegalDocumentFileVersions(empId: string, documentName: string, fileName: string): Promise<any[]> {
        return this.fileVersionService.getEmployeeFileVersions(
            fileName,
            empId,
            'legal_document',
            'legal_document',
            documentName
        );
    }

    async findByEmail(email: string): Promise<EmpDocument | null> {
        try {
            const emp = await this.empModel.findOne({ email: email }).populate({
                path: "job_id",
                model: "JobTitles",
                populate: {
                    path: "category",
                    model: "JobCategory"
                }
            }).populate({
                path: "department_id",
                model: "Department",
                populate: {
                    path: "parent_department_id",
                    model: "Department"
                }
            }).lean().exec();
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
            const emp = await this.empModel.findById(id).populate({
                path: "job_id",
                model: "JobTitles"
            }).populate({
                path: "department_id",
                model: "Department",
                populate: {
                    path: "parent_department_id",
                    model: "Department"
                }
            }).populate({
                path: 'roles',
                populate: {
                    path: 'permissions',
                    model: 'Permission'
                }
            }).populate({
                path: "supervisor_id",
                model: "Emp"
            }).exec();

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
            const emp = await this.empModel.findById(id).populate({
                path: "job_id",
                model: "JobTitles",
                populate: {
                    path: "category",
                    model: "JobCategory"
                }
            }).populate({
                path: "department_id",
                model: "Department",
                populate: {
                    path: "parent_department_id",
                    model: "Department"
                }
            }).lean().exec();
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
            const emps = await this.empModel.find({ department_id: depId }).populate({
                path: "job_id",
                model: "JobTitles",
                populate: {
                    path: "category",
                    model: "JobCategory"
                }
            }).populate({
                path: "department_id",
                model: "Department",
                populate: {
                    path: "parent_department_id",
                    model: "Department"
                }
            }).lean().exec();
            return emps.map(emp => new GetEmpDto(emp));
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch employees by department', error.message);
        }
    }

    async getMyEmp(deptId: string) {
        return await this.empModel.find({ department_id: deptId }).exec();
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
                department: employee.department_id.name
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