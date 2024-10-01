import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { CreateEmpDto } from './dto/create-emp.dto';
import { GetEmpDto } from './dto/get-emp.dto';
import { Emp, EmpDocument } from './schema/emp.schema';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateEmpDto } from './dto/update-emp.dto';
import { DepartmentService } from '../department/depratment.service';
import { TaskTypeService } from '../task type/task-type.service';
import { TaskStatusService } from '../task status/task-stauts.service';

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
        private readonly deptService: DepartmentService,
        private readonly taskTypeService: TaskTypeService,
        private readonly taskStatusService: TaskStatusService,
    ) { }

    async getAllEmp(): Promise<GetEmpDto[]> {
        try {
            const emps = await this.empModel.find({}).populate({
                path: "job_id",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                        populate: [
                            {
                                path: "parent_department_id",
                                model: "Department"
                            }
                        ]
                    }
                ]
            }).populate("department_id").exec();
            return emps.map(emp => new GetEmpDto(emp));
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch employees', error.message);
        }
    }

    async createEmp(employee: CreateEmpDto): Promise<Emp | null> {
        try {
            const hashedNewPassword = await bcrypt.hash(employee.password, 10);
            employee.password = hashedNewPassword;
            const emp = new this.empModel(employee);
            return await emp.save();
        } catch (error) {
            throw new InternalServerErrorException('Failed to create employee', error.message);
        }
    }

    async findByEmail(email: string): Promise<Emp | null> {
        try {
            const emp = await this.empModel.findOne({ email: email }).populate({
                path: "job_id",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                        populate: [
                            {
                                path: "parent_department_id",
                                model: "Department"
                            }
                        ]
                    }
                ]
            }).populate("department_id").exec();
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
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                        populate: [
                            {
                                path: "parent_department_id",
                                model: "Department"
                            }
                        ]
                    }
                ]
            }).populate({
                path: 'roles', // Assuming the employee schema has a 'roles' field
                populate: {
                    path: 'permissions', // Assuming roles have permissions
                    model: 'Permission' // Ensure you have a Permission model populated here
                }
            }).exec();

            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            return emp; // Returning the entire emp object with roles and permissions
        } catch (error) {
            throw new InternalServerErrorException('Failed to find employee by ID with roles and permissions', error.message);
        }
    }



    async findById(id: string): Promise<GetEmpDto | null> {
        try {
            const emp = await this.empModel.findById(id).populate({
                path: "job_id",
                populate: [
                    {
                        path: "department_id",
                        model: "Department",
                        populate: [
                            {
                                path: "parent_department_id",
                                model: "Department"
                            }
                        ]
                    }
                ]
            }).exec();
            if (emp) {
                return new GetEmpDto(emp);
            }
            return null;
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
            return await this.empModel.find({ department_id: depId }).lean().exec() as any;
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
            await this.empModel.findByIdAndUpdate(id, updateEmpDto).exec();
        } catch (error) {
            throw new InternalServerErrorException('Failed to update employee', error.message);
        }
    }
}
