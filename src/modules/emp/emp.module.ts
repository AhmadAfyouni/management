import { Global, Module } from "@nestjs/common";
import { forwardRef } from "@nestjs/common/utils";
import { MongooseModule } from "@nestjs/mongoose";
import { PaginationService } from "src/common/services/pagination.service";
import { DepartmentModule } from "../department/depratment.module";
import { FileVersionModule } from "../file-version/file-version.module";
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
            FileVersionModule,
        ],

        controllers: [EmpController],
        providers: [EmpService, PaginationService],
        exports: [EmpService, MongooseModule]
    }
)
export class EmpModule { }