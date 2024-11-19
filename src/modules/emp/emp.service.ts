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

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
        @Inject(forwardRef(() => JobTitlesService))
        private readonly jobTitleService: JobTitlesService,
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

    async findManagerByDepartment(departmentId: string): Promise<EmpDocument> {
        try {
            const jobTitleDoc = await this.jobTitleService.findByDepartmentId(departmentId);
            if (!jobTitleDoc) throw new NotFoundException('Job Title not found');
            const manager = await this.empModel.findOne({ job_id: jobTitleDoc._id.toString() }).exec();
            if (!manager) throw new NotFoundException('Manager not found for this job title');
            return manager;
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch manager', error.message);
        }
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

            const emp = new this.empModel({
                ...employee,
                role,
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

    async buildEmployeeTree(
        id: string,
        accessibleEmployees?: string[],
    ): Promise<any[]> {
        const employee = await this.empModel
            .findById(new Types.ObjectId(id))
            .lean()
            .exec();

        if (!employee) {
            throw new NotFoundException(`Employee with ID ${id} not found`);
        }

        const employeeList: any[] = [];

        const supervisorId = await this.empModel.findOne({
            $and: [{ department_id: employee.department_id, role: UserRole.PRIMARY_USER }]
        }).lean().select("_id").exec() as any;
        
        const employeeDto = {
            id: employee._id.toString(),
            name: employee.name,
            supervisorId: supervisorId.toString() || null,
        };

        employeeList.push(employeeDto);

        const subordinates = await this.empModel
            .find({ department_id: employee.department_id })
            .lean()
            .exec();

        for (const subordinate of subordinates) {
            const subordinateTree = await this.buildEmployeeTree(
                subordinate._id.toString(),
            );
            employeeList.push(...subordinateTree);
        }

        if (accessibleEmployees && accessibleEmployees.length > 0) {
            for (const empId of accessibleEmployees) {
                if (!employeeList.find((e) => e.id === empId)) {
                    const accessibleEmployeeTree = await this.buildEmployeeTree(
                        empId,
                    );
                    employeeList.push(...accessibleEmployeeTree);
                }
            }
        }

        return employeeList;
    }


}
