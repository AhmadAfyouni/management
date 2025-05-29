import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompanySettings, CompanySettingsDocument, ProgressCalculationMethod, WorkDay } from './schemas/company-settings.schema';
import { CreateCompanySettingsDto } from './dto/create-company-settings.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class CompanySettingsService {
  constructor(
    @InjectModel(CompanySettings.name)
    private companySettingsModel: Model<CompanySettingsDocument>,
  ) { }

  async create(createCompanySettingsDto: CreateCompanySettingsDto): Promise<any> {
    // Only allow one company settings document
    const existingSettings = await this.companySettingsModel.findOne();
    if (existingSettings) {
      return await this.update(createCompanySettingsDto);
    }

    const companySettings = new this.companySettingsModel(createCompanySettingsDto);
    return await companySettings.save();
  }

  async findOne(): Promise<CompanySettings | null> {
    return await this.companySettingsModel.findOne().exec();
  }

  async update(updateCompanySettingsDto: UpdateCompanySettingsDto): Promise<CompanySettings | null> {
    const existingSettings = await this.companySettingsModel.findOne();
    if (!existingSettings) {
      // Create default settings if none exist
      return await this.createDefaultSettings();
    }

    const updatedSettings = await this.companySettingsModel
      .findByIdAndUpdate(existingSettings._id, {
        ...updateCompanySettingsDto,
        lastUpdated: new Date(),
      }, { new: true })
      .exec();

    return updatedSettings;
  }

  async getOrCreateSettings(): Promise<CompanySettingsDocument | any> {
    let settings = await this.companySettingsModel.findOne().exec();
    if (!settings) {
      settings = await this.createDefaultSettings() as any;
    }
    return settings;
  }

  private async createDefaultSettings(): Promise<CompanySettingsDocument> {
    const defaultSettings = new this.companySettingsModel({
      workSettings: {
        workDays: [WorkDay.SUNDAY, WorkDay.MONDAY, WorkDay.TUESDAY, WorkDay.WEDNESDAY, WorkDay.THURSDAY],
        officialWorkingHoursPerDay: 8,
        workStartTime: '09:00',
        workEndTime: '17:00',
        holidays: [],
        timezone: 'Asia/Riyadh',
        overtimeRate: 1.5,
        breakTimeMinutes: 60,
      },
      taskFieldSettings: {
        enableEstimatedTime: true,
        enableActualTime: true,
        enablePriority: true,
        enableDueDate: true,
        enableFiles: true,
        enableComments: true,
        enableSubTasks: true,
        enableTimeTracking: true,
        enableRecurring: true,
        enableDependencies: true,
      },
      progressCalculationMethod: ProgressCalculationMethod.TIME_BASED,
      allowTaskDuplication: true,
      requireTaskApproval: false,
      autoGenerateTaskIds: true,
      defaultTaskReminderDays: 5,
      enableEmailNotifications: true,
      enablePushNotifications: true,
      enableTaskDeadlineReminders: true,
      enableProjectDeadlineReminders: true,
      maxFileUploadSize: 10,
      allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'],
    });

    return await defaultSettings.save();
  }

  async getWorkingDays(): Promise<WorkDay[]> {
    const settings = await this.getOrCreateSettings();
    return settings.workSettings.workDays;
  }

  async getOfficialWorkingHours(): Promise<number> {
    const settings = await this.getOrCreateSettings();
    return settings.workSettings.officialWorkingHoursPerDay;
  }

  async getProgressCalculationMethod(): Promise<ProgressCalculationMethod> {
    const settings = await this.getOrCreateSettings();
    return settings.progressCalculationMethod;
  }

  async isTaskFieldEnabled(fieldName: string): Promise<boolean> {
    const settings = await this.getOrCreateSettings();
    return settings.taskFieldSettings[fieldName] || false;
  }

  async calculateWorkingDaysBetween(startDate: Date, endDate: Date): Promise<number> {
    const settings = await this.getOrCreateSettings();
    const workDays = settings.workSettings.workDays;
    const holidays = settings.workSettings.holidays || [];

    let workingDays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;
      const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday);
        return holidayDate.toDateString() === current.toDateString();
      });

      if (workDays.includes(dayName) && !isHoliday) {
        workingDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  async calculateEstimatedHours(startDate: Date, endDate: Date): Promise<number> {
    const workingDays = await this.calculateWorkingDaysBetween(startDate, endDate);
    const dailyHours = await this.getOfficialWorkingHours();
    return workingDays * dailyHours;
  }

  async addHoliday(date: Date): Promise<CompanySettings | null> {
    const settings = await this.getOrCreateSettings();
    const holidays = [...(settings.workSettings.holidays || []), date];

    return await this.companySettingsModel
      .findByIdAndUpdate(
        settings._id,
        { 'workSettings.holidays': holidays },
        { new: true }
      )
      .exec();
  }

  async removeHoliday(date: Date): Promise<CompanySettings | null> {
    const settings = await this.getOrCreateSettings();
    const holidays = (settings.workSettings.holidays || []).filter(
      holiday => new Date(holiday).toDateString() !== date.toDateString()
    );

    return await this.companySettingsModel
      .findByIdAndUpdate(
        settings._id,
        { 'workSettings.holidays': holidays },
        { new: true }
      )
      .exec();
  }

  async getHolidays(): Promise<Date[]> {
    const settings = await this.getOrCreateSettings();
    return settings.workSettings.holidays || [];
  }

  async updateTaskFieldSettings(fieldName: string, enabled: boolean): Promise<CompanySettings | null> {
    const settings = await this.getOrCreateSettings();

    return await this.companySettingsModel
      .findByIdAndUpdate(
        settings._id,
        { [`taskFieldSettings.${fieldName}`]: enabled },
        { new: true }
      )
      .exec();
  }
}
