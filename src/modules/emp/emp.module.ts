import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EmpService } from "./emp.service";
import { Emp, EmpSchema } from "./schema/emp.schema";
@Module(
    {
        imports: [
            MongooseModule.forFeature([{ name: Emp.name, schema: EmpSchema }]),
        ],
        providers: [EmpService],
        exports: [EmpService]
    }
)
export class EmpModule { }