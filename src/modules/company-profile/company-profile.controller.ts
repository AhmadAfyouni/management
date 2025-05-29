import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyProfileService } from './company-profile.service';
import { CreateCompanyProfileDto } from './dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../config/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('company-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) { }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createCompanyProfileDto: CreateCompanyProfileDto) {
    try {
      const profile = await this.companyProfileService.create(createCompanyProfileDto);
      return {
        status: true,
        message: 'Company profile created successfully',
        data: profile,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  async findOne() {
    try {
      const profile = await this.companyProfileService.findOne();
      return {
        status: true,
        message: profile ? 'Company profile retrieved successfully' : 'No company profile found',
        data: profile,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put()
  @Roles(UserRole.ADMIN)
  async update(@Body() updateCompanyProfileDto: UpdateCompanyProfileDto) {
    try {
      const profile = await this.companyProfileService.update(updateCompanyProfileDto);
      return {
        status: true,
        message: 'Company profile updated successfully',
        data: profile,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('setup-status')
  async getSetupStatus() {
    try {
      const isCompleted = await this.companyProfileService.isSetupCompleted();
      return {
        status: true,
        message: 'Setup status retrieved successfully',
        data: { isSetupCompleted: isCompleted },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('complete-setup')
  @Roles(UserRole.ADMIN)
  async completeSetup() {
    try {
      await this.companyProfileService.markSetupCompleted();
      return {
        status: true,
        message: 'Company setup marked as completed',
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('business-types')
  async getBusinessTypes() {
    try {
      const businessTypes = await this.companyProfileService.getBusinessTypes();
      return {
        status: true,
        message: 'Business types retrieved successfully',
        data: businessTypes,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('upload-logo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const logoUrl = `/uploads/company-logos/${file.filename}`;

      const profile = await this.companyProfileService.uploadLogo(logoUrl);
      return {
        status: true,
        message: 'Company logo uploaded successfully',
        data: profile,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('license')
  @Roles(UserRole.ADMIN)
  async addLicense(@Body() licenseData: any) {
    try {
      const profile = await this.companyProfileService.findOne();
      if (!profile) {
        throw new BadRequestException('Company profile not found');
      }

      const updatedProfile = await this.companyProfileService.addLicenseCertification(
        (profile as any)._id.toString(),
        licenseData
      );

      return {
        status: true,
        message: 'License/Certification added successfully',
        data: updatedProfile,
      };
    } catch (error) {
      throw error;
    }
  }
}
