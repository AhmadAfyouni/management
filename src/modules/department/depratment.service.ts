import { forwardRef, Injectable, InternalServerErrorException, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DepartmentDocument } from './schema/department.schema';
import { GetDepartmentDto } from './dto/get-department.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { TreeDTO } from './dto/tree-dto';
import { EmpService } from '../emp/emp.service';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectModel("Department") private readonly departmentModel: Model<DepartmentDocument>,
        @Inject(forwardRef(() => EmpService))
        private readonly empService: EmpService
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
            if (parent_department_id) {
                const manager = await this.empService.findManagerByDepartment(parent_department_id.toString());
                const manager2 = await this.empService.findManagerByDepartment(id);
                if (manager && manager2) {
                    manager2.parentId! = manager?._id.toString();
                    manager2.save();
                }
            }
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





}
