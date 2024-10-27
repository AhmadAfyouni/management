import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { CreateEmpDto } from './dto/create-emp.dto';
import { GetEmpDto } from './dto/get-emp.dto';
import { Emp, EmpDocument } from './schemas/emp.schema';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateEmpDto } from './dto/update-emp.dto';

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
    ) { }

    async getAllEmp(): Promise<GetEmpDto[]> {
        try {
            const emps = await this.empModel.find({}).populate({
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
                path: "supervisor_id",
                model: "Emp"
            }).exec();
            return emps.map(emp => new GetEmpDto(emp));
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch employees', error.message);
        }
    }
    async createEmp(employee: CreateEmpDto): Promise<Emp | null> {
        try {
            console.log('Employee data being saved:', JSON.stringify(employee, null, 2));

            const existingEmp = await this.empModel.findOne({ $or: [{ email: employee.email }, { phone: employee.phone }] });
            if (existingEmp) {
                throw new BadRequestException('Employee with this email or phone already exists.');
            }

            const hashedNewPassword = await bcrypt.hash(employee.password, 10);
            employee.password = hashedNewPassword;
            const emp = new this.empModel(employee);
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
                model: "JobTitles"
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
                model: "JobTitles"
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

            // Handle password update separately to ensure proper hashing
            if (updateEmpDto.password) {
                const hashedNewPassword = await bcrypt.hash(updateEmpDto.password, 10);
                updateEmpDto.password = hashedNewPassword;
            }

            await this.empModel.findByIdAndUpdate(id, updateEmpDto, { runValidators: true }).exec();
        } catch (error) {
            throw new InternalServerErrorException('Failed to update employee', error.message);
        }
    }
}
