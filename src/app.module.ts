import { DatabaseModule } from "./modules/database/database.module";
import { DatabaseService } from "./modules/database/database.service";
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DepartmentModule } from "./modules/department/depratment.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JobTitlesModule } from "./modules/job-titles/job-titles.module";
import { EmpModule } from "./modules/emp/emp.module";
import { TaskModule } from "./modules/task/task.module";
import { TaskTypeModule } from "./modules/task type/task-type.module";
import { TaskStatusModule } from "./modules/task status/task-stauts.module";
import { CommentModule } from "./modules/comment/comment.module";
import { ConfigModule } from "@nestjs/config";
import { InternalCommunicationsModule } from "./modules/internal-communications/communications.module";
import { RolesPermissionsModule } from "./modules/permisssions/permission.module";
import { JobCategoryModule } from "./modules/job-category/job-category.module";

@Module(
  {
    imports: [
      ConfigModule.forRoot(
        {
          envFilePath: ".env",
          isGlobal: true,
        }
      ),
      JobCategoryModule,
      RolesPermissionsModule,
      InternalCommunicationsModule,
      CommentModule,
      TaskModule,
      TaskTypeModule,
      TaskStatusModule,
      EmpModule,
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
