import { forwardRef, Injectable, InternalServerErrorException, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DepartmentDocument } from './schema/department.schema';
import { GetDepartmentDto } from './dto/get-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { EmpService } from '../emp/emp.service';
import { ConfigService } from '@nestjs/config';
import { FileUploadService } from '../upload';
import { NotificationService } from '../notification/notification.service';
import { FileVersionService } from '../file-version/file-version.service';


@Injectable()
export class DepartmentService {

    constructor(
        @InjectModel("Department") private readonly departmentModel: Model<DepartmentDocument>,
        @Inject(forwardRef(() => EmpService))
        private readonly empService: EmpService,
        private configService: ConfigService,
        private readonly notificationService: NotificationService,
        private readonly fileVersionService: FileVersionService,
    ) { }

    async getAllDepts(): Promise<GetDepartmentDto[]> {
        const depts = await this.departmentModel.find({}).populate("parent_department_id").exec();
        return depts.map(dept => new GetDepartmentDto(dept));
    }


    async createDeptWithFiles(deptDto: any, empId: string): Promise<any> {
        try {
            const { parent_department_id, supportingFiles, requiredReports, developmentPrograms, ...rest } = deptDto;

            const dept = new this.departmentModel({
                ...rest,
                parent_department_id: parent_department_id ? new Types.ObjectId(parent_department_id) : undefined,
            });

            await dept.save();
            const departmentId = dept._id.toString();

            if (supportingFiles && supportingFiles.length > 0) {
                for (const fileUrl of supportingFiles) {
                    await this.fileVersionService.createDepartmentFileVersion(fileUrl, departmentId, 'supporting');
                }
                dept.supportingFiles = supportingFiles;
            }

            if (requiredReports && requiredReports.length > 0) {
                const processedReports = await Promise.all(
                    requiredReports.map(async (report: any) => {
                        if (report.templateFile) {
                            await this.fileVersionService.createDepartmentFileVersion(
                                report.templateFile,
                                departmentId,
                                'template'
                            );
                        }
                        return report;
                    })
                );
                dept.requiredReports = processedReports;
            }

            if (developmentPrograms && developmentPrograms.length > 0) {
                const processedPrograms = await Promise.all(
                    developmentPrograms.map(async (program: any) => {
                        if (program.programFile) {
                            await this.fileVersionService.createDepartmentFileVersion(
                                program.programFile,
                                departmentId,
                                'program'
                            );
                        }
                        return program;
                    })
                );
                dept.developmentPrograms = processedPrograms;
            }

            await dept.save();

            const updatedDept = await this.departmentModel.findById(departmentId).exec();
            await this.notificationService.notifyDepartmentCreated(updatedDept!, empId);

            return {
                message: "تم إنشاء القسم بنجاح مع الملفات",
                status: true,
                department: updatedDept
            };
        } catch (error) {
            console.error("خطأ في إنشاء القسم مع الملفات:", error);
            return { message: error.message, status: false };
        }
    }




    async findByName(name: string): Promise<GetDepartmentDto | null> {
        const dept = await this.departmentModel.findOne({ name }).exec();
        return dept ? new GetDepartmentDto(dept) : null;
    }

    async findById(id: string): Promise<GetDepartmentDto | null> {
        const dept = await this.departmentModel.findById(id).populate("parent_department_id").exec();
        return dept ? new GetDepartmentDto(dept) : null;
    }

    async findSubDepartments(): Promise<GetDepartmentDto[]> {
        try {
            const departments = await this.departmentModel.find({
                parent_department_id: { $ne: null }
            }).exec();
            return departments.map(dept => new GetDepartmentDto(dept));
        } catch (error) {
            console.error('Error finding departments with non-null parent_department_id:', error);
            throw new InternalServerErrorException('Failed to find departments with non-null parent_department_id');
        }
    }

    async updateDept(id: string, deptDto: UpdateDepartmentDto): Promise<any> {
        try {
            const { parent_department_id, supportingFiles, requiredReports, developmentPrograms, ...rest } = deptDto;

            const existingDept = await this.departmentModel.findById(id).exec();
            if (!existingDept) {
                throw new NotFoundException(`لم يتم العثور على قسم بالمعرف ${id}`);
            }

            if (supportingFiles && supportingFiles.length > 0) {
                for (const fileUrl of supportingFiles) {
                    const fileExists = existingDept.supportingFiles.includes(fileUrl);
                    if (!fileExists) {
                        await this.fileVersionService.createDepartmentFileVersion(fileUrl, id, 'supporting');
                    }
                }
            }

            if (requiredReports && requiredReports.length > 0) {
                for (const report of requiredReports) {
                    if (report.templateFile) {
                        const existingReport = existingDept.requiredReports.find(r => r.name === report.name);

                        if (!existingReport || existingReport.templateFile !== report.templateFile) {
                            await this.fileVersionService.createDepartmentFileVersion(report.templateFile, id, 'template');
                        }
                    }
                }
            }

            if (developmentPrograms && developmentPrograms.length > 0) {
                for (const program of developmentPrograms) {
                    if (program.programFile) {
                        const existingProgram = existingDept.developmentPrograms.find(
                            p => p.programName === program.programName
                        );

                        if (!existingProgram || existingProgram.programFile !== program.programFile) {
                            await this.fileVersionService.createDepartmentFileVersion(program.programFile, id, 'program');
                        }
                    }
                }
            }

            const result = await this.departmentModel.findByIdAndUpdate(
                id,
                {
                    ...rest,
                    parent_department_id: parent_department_id ? new Types.ObjectId(parent_department_id) : undefined,
                    supportingFiles: supportingFiles || existingDept.supportingFiles,
                    requiredReports: requiredReports || existingDept.requiredReports,
                    developmentPrograms: developmentPrograms || existingDept.developmentPrograms
                },
                {
                    new: true,
                    runValidators: true,
                }
            ).exec();

            if (parent_department_id) {
                const manager = await this.empService.findManagerByDepartment(parent_department_id.toString());
                const manager2 = await this.empService.findManagerByDepartment(id);

                if (manager && manager2) {
                    manager2.parentId = manager._id.toString();
                    manager2.save();
                }
            }

            if (!result) {
                throw new NotFoundException(`لم يتم العثور على قسم بالمعرف ${id}`);
            }

            return new GetDepartmentDto(result);
        } catch (error) {
            if (error.name === 'CastError' && error.kind === 'ObjectId') {
                throw new NotFoundException(`لم يتم العثور على قسم بالمعرف ${id}`);
            }
            throw new InternalServerErrorException('خطأ في تحديث القسم: ' + error.message);
        }
    }

    async getFileVersions(departmentId: string, fileType: string, fileName: string): Promise<any[]> {
        return await this.fileVersionService.getDepartmentFileVersions(fileName, departmentId, fileType);
    }


    private async getDepartmentWithSubDepartments(id: string): Promise<DepartmentDocument[]> {
        const department = await this.departmentModel.findById(id).populate("parent_department_id").exec();
        if (!department) {
            throw new NotFoundException(`Department with ID ${id} not found`);
        }

        const allSubDepartments: DepartmentDocument[] = [];

        const subDepartments = await this.departmentModel.find({ parent_department_id: id }).exec();

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

        const department = await this.departmentModel.findById(objectId).exec();
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
                    title: emp.job.title
                }
            })
        };

        departmentList.push(departmentDto);
        departmentInfoList.push(new GetDepartmentDto(department));

        const subDepartments = await this.departmentModel
            .find({ parent_department_id: objectId })
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
