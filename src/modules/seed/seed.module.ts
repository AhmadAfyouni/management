import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Department, DepartmentSchema } from "../department/schema/department.schema";
import { Emp, EmpSchema } from "../emp/schemas/emp.schema";
import { JobCategory, JobCategorySchema } from "../job-category/schemas/job-category.schema";
import { JobTitles, JobTitlesSchema } from "../job-titles/schema/job-ttiles.schema";
import { SeedService } from "./seed.service";

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                { name: Emp.name, schema: EmpSchema },
                { name: Department.name, schema: DepartmentSchema },
                { name: JobTitles.name, schema: JobTitlesSchema },
                { name: JobCategory.name, schema: JobCategorySchema },
            ]
        ),
    ],
    providers: [
        SeedService,
    ]

})
export class SeedModule { }