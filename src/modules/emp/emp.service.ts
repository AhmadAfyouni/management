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

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
        @Inject(forwardRef(() => JobTitlesService))
        private readonly jobTitleService: JobTitlesService,
        private readonly departmentService: DepartmentService
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
        const jobTitleDoc = await this.jobTitleService.findByDepartmentId(departmentId);
        const manager = await this.empModel.findOne({ job_id: jobTitleDoc._id.toString() }).exec();
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
                $or: [{ email: employee.email }, { phone: employee.phone }]
            });
            if (existingEmp) {
                throw new ConflictException('Employee with this email or phone already exists.');
            }

            const jobTitle = await this.jobTitleService.findOne(employee.job_id.toString());
            let role: UserRole = UserRole.SECONDARY_USER;
            if (jobTitle?.is_manager) {
                role = UserRole.PRIMARY_USER;
            }

            const hashedNewPassword = await bcrypt.hash(employee.password, 10);
            employee.password = hashedNewPassword;
            const manager = await this.findManagerByDepartment(employee.department_id.toString());
            const emp = new this.empModel({
                ...employee,
                role,
                parentId: manager!=null ? manager._id.toString() : null
            });
            return await emp.save();
        } catch (error) {
            console.error('Error creating employee:', error);
            throw new InternalServerErrorException('Failed to create employee', error.message);
        }
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
                path: 'roles', // Assuming the employee schema has a 'roles' field
                populate: {
                    path: 'permissions',
                    model: 'Permission' // Ensure you have a Permission model populated here
                }
            }).populate({
                path: "supervisor_id",
                model: "Emp"
            }).exec();

            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            return emp; // Returning the entire emp object with roles and permissions
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

    async getEmpByDepartment(depId: string): Promise<any[]> {
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

            return await this.empModel.findByIdAndUpdate(id, updateEmpDto, { runValidators: true, new: true }).exec();
        } catch (error) {
            throw new InternalServerErrorException('Failed to update employee', error.message);
        }
    }



    async getMyEmp(deptId: string) {
        return await this.empModel.find({ department_id: deptId }).exec();
    }
    async buildEmployeeTree(id: string, start: boolean = true): Promise<any[]> {
        console.log(id);

        let allEmployees: any[] = [];
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid Employee ID');
        }


        const employee = await this.empModel
            .findById(new Types.ObjectId(id))
            .populate("job_id")
            .lean()
            .exec() as any;

        if (!employee.job_id.is_manager) {
            return [];
        }

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        if (start) {
            allEmployees.push({
                id: employee._id.toString(),
                name: employee.name,
                parentId: employee.parentId || null,
                is_manager: employee.role === UserRole.PRIMARY_USER || employee.role === UserRole.ADMIN,
            });
        }

        const directReports = await this.empModel
            .find({ department_id: employee.job_id.department_id })
            .exec();
        const directReportsDto = directReports.map((report) => {
            return {
                id: report._id.toString(),
                name: report.name,
                parentId: report.parentId || null,
                is_manager: report.role === UserRole.PRIMARY_USER || report.role === UserRole.ADMIN,
            }
        });

        allEmployees.push(...directReportsDto);
        for (const report of directReports) {
            if (report._id.toString() !== employee._id.toString()) {
                report.parentId = id ?? null;
                await report.save();
                const subTree = await this.buildEmployeeTree(report._id.toString(), false);
                allEmployees.push(...subTree);
            }
        }
        return allEmployees;
    }






}
