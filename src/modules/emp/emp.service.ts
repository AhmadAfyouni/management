import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { CreateEmpDto } from './dto/create-emp.dto';
import { GetEmpDto } from './dto/get-emp.dto';
import { Emp, EmpDocument } from './schema/emp.schema';

@Injectable()
export class EmpService {
    constructor(
        @InjectModel(Emp.name) private readonly empModel: Model<EmpDocument>,
    ) { }


    async getAllEmp(): Promise<GetEmpDto[]> {
        const emps = await this.empModel.find({}).populate("job_id").exec();        
        return emps.map(emp => new GetEmpDto(emp));
    }

    async createEmp(employee: CreateEmpDto): Promise<Emp | null> {
        const hashedPassword = await bcrypt.hash(employee.password, 10);
        employee.password = hashedPassword;
        const emp = new this.empModel(employee);
        return await emp.save();
    }

    async findByEmail(email: string): Promise<Emp | null> {
        const emp = await this.empModel.findOne({ email: email }).exec();
        if (emp) {
            return emp;
        }
        return null;
    }
    
    async findById(id:string){
        const emp = await this.empModel.findById(id).exec();
        if (emp) {
            return new GetEmpDto(emp);
        }
        return null;
    }
}