import { DatabaseModule } from "./modules/database/database.module";
import { DatabaseService } from "./modules/database/database.service";
import { UserModule } from "./modules/emp/emp.module";
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Module(
  {
    imports: [
      DatabaseModule,
      UserModule
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
