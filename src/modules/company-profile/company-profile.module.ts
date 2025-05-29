import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyProfileService } from './company-profile.service';
import { CompanyProfileController } from './company-profile.controller';
import { CompanyProfile, CompanyProfileSchema } from './schemas/company-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyProfile.name, schema: CompanyProfileSchema },
    ]),
  ],
  controllers: [CompanyProfileController],
  providers: [CompanyProfileService],
  exports: [CompanyProfileService],
})
export class CompanyProfileModule {}
