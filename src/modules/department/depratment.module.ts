import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DepartmentController } from "./depratment.controller";
import { DepartmentService } from "./depratment.service";
import { Department, DepartmentSchema } from "./schema/department.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Department.name, schema: DepartmentSchema }]),
    ],
    controllers: [DepartmentController],
    providers: [DepartmentService],
    exports: [DepartmentService],
})
export class DepartmentModule {}