import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DepartmentDocument } from './schema/department.schema';
import { GetDepartmentDto } from './dto/get-department.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

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
            const { parent_department_id, ...rest } = deptDto;
            const dept = new this.departmentModel({
                ...rest,
                parent_department_id: parent_department_id ? new Types.ObjectId(parent_department_id) : undefined,
            });
            await dept.save();
            return { msg: "Created department successfully", status: true };
        } catch (error) {
            console.error("Error creating department:", error);
            return { msg: error.message, status: false };
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
            const { parent_department_id, ...rest } = deptDto;
            const result = await this.departmentModel.findByIdAndUpdate(
                id,
                {
                    ...rest,
                    parent_department_id: parent_department_id ? new Types.ObjectId(parent_department_id) : undefined,
                },
                {
                    new: true,
                    runValidators: true,
                }
            ).exec();

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
    

    async viewAccessDepartment(ids: string[]): Promise<GetDepartmentDto[]> {
        const results: GetDepartmentDto[] = [];
    
        for (const id of ids) {
            const departments = await this.getDepartmentWithSubDepartments(id);
            results.push(...departments.map(dept => new GetDepartmentDto(dept)));
        }
    
        return results;
    }
    



}
