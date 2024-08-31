import { DatabaseModule } from "./modules/database/database.module";
import { DatabaseService } from "./modules/database/database.service";
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DepartmentModule } from "./modules/department/depratment.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JobTitlesModule } from "./modules/job-titles/job-titles.module";

@Module(
  {
    imports: [
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
