import { DatabaseModule } from "./modules/database/database.module";
import { DatabaseService } from "./modules/database/database.service";
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DepartmentModule } from "./modules/department/depratment.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JobTitlesModule } from "./modules/job-titles/job-titles.module";
<<<<<<< HEAD
import { EmpModule } from "./modules/emp/emp.module";
import { MongooseModule } from "@nestjs/mongoose";
import { Department, DepartmentSchema } from "./modules/department/schema/department.schema";
import { JobTitles, JobTitlesSchema } from "./modules/job-titles/schema/job-ttiles.schema";
import { Emp, EmpSchema } from "./modules/emp/schema/emp.schema";
=======
import { ConfigModule } from "@nestjs/config";
import { env } from "process";
>>>>>>> 5d2f13ab403e77d14adb2ba71fda3608cf6a4a07

@Module(
  {
    imports: [
<<<<<<< HEAD
      EmpModule,
=======
      ConfigModule.forRoot(
        {
          envFilePath: ".env",
          isGlobal:true,
        }
      ),
>>>>>>> 5d2f13ab403e77d14adb2ba71fda3608cf6a4a07
      JobTitlesModule,
      AuthModule,
      DatabaseModule,
      DepartmentModule,
    ],
  }
)
export class AppModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly databaseService: DatabaseService) { }

  async onModuleInit() {
    await this.databaseService.onInit();
  }

  async onModuleDestroy() {
    await this.databaseService.onDestroy();
  }
}
