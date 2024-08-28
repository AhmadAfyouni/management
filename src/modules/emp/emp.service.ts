import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GetEmpDTO } from './dto/get-emp.dto';
import { Emp, EmpDocument } from './schema/emp.schema';

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
    ) { }
    async getAllEmp(): Promise<GetEmpDTO[]> {
        return this.empModel.find({});
    }

    async createEmp(employee: Emp): Promise<Emp | null> {
        const emp = new this.empModel(employee);
        return await emp.save();
    }
}