import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { PaginationService } from "src/common/services/pagination.service";
import { EmpModule } from "../emp/emp.module";
import { FileModule } from "../file-manager/file-manager.module";
import { NotificationModule } from "../notification/notification.module";
import { DepartmentController } from "./depratment.controller";
import { DepartmentService } from "./depratment.service";
import { Department, DepartmentSchema } from "./schema/department.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Department.name, schema: DepartmentSchema }]),
        forwardRef(() => EmpModule),
        ConfigModule,
        NotificationModule,
        FileModule
    ],
    controllers: [DepartmentController],
    providers: [DepartmentService, PaginationService],
    exports: [DepartmentService],
})
export class DepartmentModule { }