import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EmpController } from "./emp.controller";
import { EmpService } from "./emp.service";
import { Emp, EmpSchema } from "./schema/emp.schema";
@Module(
    {
        imports: [
            MongooseModule.forFeature([{ name: Emp.name, schema: EmpSchema }]),
        ],

        controllers:[EmpController],
        providers: [EmpService],
        exports: [EmpService]
    }
)
export class EmpModule { }