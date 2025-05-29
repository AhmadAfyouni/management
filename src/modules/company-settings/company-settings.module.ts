import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanySettingsService } from './company-settings.service';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettings, CompanySettingsSchema } from './schemas/company-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanySettings.name, schema: CompanySettingsSchema },
    ]),
  ],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
