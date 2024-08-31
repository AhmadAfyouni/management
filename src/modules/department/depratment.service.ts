import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './schema/department.schema';
import { GetDepartmentDto } from './dto/get-department.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
    ) { }


    async getAllDepts(): Promise<GetDepartmentDto[]> {
        const depts = await this.departmentModel.find({}).populate("parent_department_id").exec();
        return depts.map(dept => new GetDepartmentDto(dept));
    }

    async createDept(deptDto: CreateDepartmentDto): Promise<any> {
        try {
            const dept = new this.departmentModel({
                name: deptDto.name,
                description: deptDto.description,
                parent_department_id: deptDto.parent_department_id ? new Types.ObjectId(deptDto.parent_department_id) : null,
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

    async findById(id: string) {
        const dept = await this.departmentModel.findById(id).exec();
        if (dept) {
            return new GetDepartmentDto(dept);
        }
        return null;
    }


}