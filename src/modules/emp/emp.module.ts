import { Global, Module } from "@nestjs/common";
import { forwardRef } from "@nestjs/common/utils";
import { MongooseModule } from "@nestjs/mongoose";
import { DepartmentModule } from "../department/depratment.module";
import { JobTitlesModule } from "../job-titles/job-titles.module";
import { EmpController } from "./emp.controller";
import { EmpService } from "./emp.service";
import { Emp, EmpSchema } from "./schemas/emp.schema";
@Global()
@Module(
    {
        imports: [
            MongooseModule.forFeature([{ name: Emp.name, schema: EmpSchema },]),
            forwardRef(() => DepartmentModule),
            forwardRef(() => JobTitlesModule),
        ],

        controllers: [EmpController],
        providers: [EmpService],
        exports: [EmpService, MongooseModule]
    }
)
export class EmpModule  { }