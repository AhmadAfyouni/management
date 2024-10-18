import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DepartmentDocument } from './schema/department.schema';
import { GetDepartmentDto } from './dto/get-department.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectModel("Department") private readonly departmentModel: Model<DepartmentDocument>,
    ) { }

    async getAllDepts(): Promise<GetDepartmentDto[]> {
        const depts = await this.departmentModel.find({}).populate("parent_department_id").exec();
        return depts.map(dept => new GetDepartmentDto(dept));
    }

    async createDept(deptDto: CreateDepartmentDto): Promise<any> {
        try {
            const dept = new this.departmentModel({
                name: deptDto.name,
                goal: deptDto.goal,
                category: deptDto.category,
                mainTasks: deptDto.mainTasks,
                parent_department_id: deptDto.parent_department_id ? new Types.ObjectId(deptDto.parent_department_id) : null,
                numericOwners: deptDto.numericOwners,
                supportingFiles: deptDto.supportingFiles,
                requiredReports: deptDto.requiredReports,
                developmentPrograms: deptDto.developmentPrograms
            });
            await dept.save();
            return { msg: "Created department successfully", status: true };
        } catch (error) {
            return { msg: error.message, status: false };
        }
    }

    async findByName(name: string): Promise<GetDepartmentDto | null> {
        const dept = await this.departmentModel.findOne({ name: name }).exec();
        if (dept) {
            return new GetDepartmentDto(dept);
        }
        return null;
    }

    async findById(id: string): Promise<GetDepartmentDto | null> {
        const dept = await this.departmentModel.findById(id).populate("parent_department_id").exec();
        if (dept) {
            return new GetDepartmentDto(dept);
        }
        return null;
    }

    async findSubDepartments(): Promise<GetDepartmentDto[]> {
        try {
            const departments = await this.departmentModel.find({
                parent_department_id: { $ne: null }
            }).exec();
            
            return departments.map(dept => new GetDepartmentDto(dept));
        } catch (error) {
            console.error('Error finding departments with non-null parent_department_id:', error);
            throw new Error('Failed to find departments with non-null parent_department_id');
        }
    }

    async updateDept(id: string, deptDto: Partial<CreateDepartmentDto>): Promise<any> {
        try {
            const result = await this.departmentModel.findByIdAndUpdate(id, {
                ...deptDto,
                parent_department_id: deptDto.parent_department_id ? new Types.ObjectId(deptDto.parent_department_id) : null,
            }, {
                new: true,
                runValidators: true
            }).exec();
            if (!result) {
                throw new NotFoundException(`Department with ID ${id} not found`);
            }
            return new GetDepartmentDto(result);
        } catch (error) {
            if (error.name === 'CastError' && error.kind === 'ObjectId') {
                throw new NotFoundException(`Department with ID ${id} not found`);
            }
            throw new InternalServerErrorException('Error updating department');
        }
    }
}
