import { DatabaseModule } from "./modules/database/database.module";
import { DatabaseService } from "./modules/database/database.service";
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DepartmentModule } from "./modules/department/depratment.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JobTitlesModule } from "./modules/job-titles/job-titles.module";
import { EmpModule } from "./modules/emp/emp.module";
import { TaskModule } from "./modules/task/task.module";
import { CommentModule } from "./modules/comment/comment.module";
import { ConfigModule } from "@nestjs/config";
import { InternalCommunicationsModule } from "./modules/internal-communications/communications.module";
import { JobCategoryModule } from "./modules/job-category/job-category.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ProjectModule } from "./modules/project/project.module";
import { SectionModule } from "./modules/section/section.module";
import { SeedModule } from "./modules/seed/seed.module";
import { TemplateModule } from "./modules/template/template.module";
import { TransactionModule } from "./modules/transaction/transaction.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { FileModule } from "./modules/file-manager/file-manager.module";
import { FileUploadModule } from "./modules/file-upload/file-upload.module";
import { CompanyProfileModule } from "./modules/company-profile/company-profile.module";
import { CompanySettingsModule } from "./modules/company-settings/company-settings.module";

@Module(
  {
    imports: [

      SeedModule,
      ConfigModule.forRoot(
        {
          envFilePath: ".env",
          isGlobal: true,
        }
      ),
      ScheduleModule.forRoot(),
      CompanyProfileModule,
      CompanySettingsModule,
      ProjectModule,
      SectionModule,
      JobCategoryModule,
      InternalCommunicationsModule,
      CommentModule,
      TaskModule,
      EmpModule,
      JobTitlesModule,
      AuthModule,
      DatabaseModule,
      DepartmentModule,
      TemplateModule,
      TransactionModule,
      NotificationModule,
      DashboardModule,
      FileModule,
      FileUploadModule
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
