import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EmpModule } from "../emp/emp.module";
import { FileVersionModule } from "../file-version/file-version.module";
import { NotificationModule } from "../notification/notification.module";
import { FileUploadModule } from "../upload";
import { DepartmentController } from "./depratment.controller";
import { DepartmentService } from "./depratment.service";
import { Department, DepartmentSchema } from "./schema/department.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Department.name, schema: DepartmentSchema }]),
        forwardRef(() => EmpModule),
        NotificationModule,
        FileVersionModule
    ],
    controllers: [DepartmentController],
    providers: [DepartmentService],
    exports: [DepartmentService],
})
export class DepartmentModule { }