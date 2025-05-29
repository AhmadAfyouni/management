import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  UseGuards,
  Query,
  Param,
  Delete,
} from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { CreateCompanySettingsDto } from './dto/create-company-settings.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/role.decorator';
import { UserRole } from '../../config/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('company-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createCompanySettingsDto: CreateCompanySettingsDto) {
    try {
      const settings = await this.companySettingsService.create(createCompanySettingsDto);
      return {
        status: true,
        message: 'Company settings created successfully',
        data: settings,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  async findOne() {
    try {
      const settings = await this.companySettingsService.getOrCreateSettings();
      return {
        status: true,
        message: 'Company settings retrieved successfully',
        data: settings,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put()
  @Roles(UserRole.ADMIN)
  async update(@Body() updateCompanySettingsDto: UpdateCompanySettingsDto) {
    try {
      const settings = await this.companySettingsService.update(updateCompanySettingsDto);
      return {
        status: true,
        message: 'Company settings updated successfully',
        data: settings,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('working-days')
  async getWorkingDays() {
    try {
      const workingDays = await this.companySettingsService.getWorkingDays();
      return {
        status: true,
        message: 'Working days retrieved successfully',
        data: workingDays,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('working-hours')
  async getWorkingHours() {
    try {
      const workingHours = await this.companySettingsService.getOfficialWorkingHours();
      return {
        status: true,
        message: 'Working hours retrieved successfully',
        data: { officialWorkingHours: workingHours },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('progress-method')
  async getProgressCalculationMethod() {
    try {
      const method = await this.companySettingsService.getProgressCalculationMethod();
      return {
        status: true,
        message: 'Progress calculation method retrieved successfully',
        data: { progressCalculationMethod: method },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('calculate-working-days')
  async calculateWorkingDays(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const workingDays = await this.companySettingsService.calculateWorkingDaysBetween(start, end);
      const estimatedHours = await this.companySettingsService.calculateEstimatedHours(start, end);
      
      return {
        status: true,
        message: 'Working days calculated successfully',
        data: {
          workingDays,
          estimatedHours,
          startDate: start,
          endDate: end,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('task-field/:fieldName')
  async isTaskFieldEnabled(@Param('fieldName') fieldName: string) {
    try {
      const enabled = await this.companySettingsService.isTaskFieldEnabled(fieldName);
      return {
        status: true,
        message: `Task field ${fieldName} status retrieved successfully`,
        data: { fieldName, enabled },
      };
    } catch (error) {
      throw error;
    }
  }

  @Put('task-field/:fieldName')
  @Roles(UserRole.ADMIN)
  async updateTaskFieldSetting(
    @Param('fieldName') fieldName: string,
    @Body('enabled') enabled: boolean,
  ) {
    try {
      const settings = await this.companySettingsService.updateTaskFieldSettings(fieldName, enabled);
      return {
        status: true,
        message: `Task field ${fieldName} updated successfully`,
        data: settings,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('holidays')
  @Roles(UserRole.ADMIN)
  async addHoliday(@Body('date') date: string) {
    try {
      const holidayDate = new Date(date);
      const settings = await this.companySettingsService.addHoliday(holidayDate);
      return {
        status: true,
        message: 'Holiday added successfully',
        data: settings,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('holidays')
  @Roles(UserRole.ADMIN)
  async removeHoliday(@Body('date') date: string) {
    try {
      const holidayDate = new Date(date);
      const settings = await this.companySettingsService.removeHoliday(holidayDate);
      return {
        status: true,
        message: 'Holiday removed successfully',
        data: settings,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('holidays')
  async getHolidays() {
    try {
      const holidays = await this.companySettingsService.getHolidays();
      return {
        status: true,
        message: 'Holidays retrieved successfully',
        data: holidays,
      };
    } catch (error) {
      throw error;
    }
  }
}
