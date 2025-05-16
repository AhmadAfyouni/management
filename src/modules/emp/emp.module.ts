import { Global, Module } from "@nestjs/common";
import { forwardRef } from "@nestjs/common/utils";
import { MongooseModule } from "@nestjs/mongoose";
import { PaginationService } from "src/common/services/pagination.service";
import { DepartmentModule } from "../department/depratment.module";
import { FileModule } from "../file-manager/file-manager.module";
import { FileSchema } from "../file-manager/schemas/file.scheme";
import { JobTitlesModule } from "../job-titles/job-titles.module";
import { EmpController } from "./emp.controller";
import { EmpService } from "./emp.service";
import { Emp, EmpSchema } from "./schemas/emp.schema";
@Global()
@Module(
    {
        imports: [
            MongooseModule.forFeature([{ name: Emp.name, schema: EmpSchema },]),
            MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
            forwardRef(() => DepartmentModule),
            forwardRef(() => JobTitlesModule),
            FileModule,
        ],

        controllers: [EmpController],
        providers: [EmpService, PaginationService],
        exports: [EmpService, MongooseModule]
    }
)
export class EmpModule { }