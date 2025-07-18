import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompanySettings, CompanySettingsDocument, ProgressCalculationMethod, WorkDay, DayWorkingHours } from './schemas/company-settings.schema';
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

    // Ensure overtimeRate is at least 1 if provided or set to 1 if cleared
    if (updateCompanySettingsDto.workSettings) {
      if (
        updateCompanySettingsDto.workSettings.overtimeRate === undefined ||
        updateCompanySettingsDto.workSettings.overtimeRate === null ||
        updateCompanySettingsDto.workSettings.overtimeRate < 1
      ) {
        updateCompanySettingsDto.workSettings.overtimeRate = 1;
      }
    }

    // Always set isFirstTime to false on update
    const updatedSettings = await this.companySettingsModel
      .findByIdAndUpdate(existingSettings._id, {
        ...updateCompanySettingsDto,
        isFirstTime: false,
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
    const defaultDayWorkingHours: DayWorkingHours[] = [
      { day: WorkDay.SUNDAY, isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimeMinutes: 60 },
      { day: WorkDay.MONDAY, isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimeMinutes: 60 },
      { day: WorkDay.TUESDAY, isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimeMinutes: 60 },
      { day: WorkDay.WEDNESDAY, isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimeMinutes: 60 },
      { day: WorkDay.THURSDAY, isWorkingDay: true, startTime: '09:00', endTime: '17:00', breakTimeMinutes: 60 },
      { day: WorkDay.FRIDAY, isWorkingDay: false, startTime: '09:00', endTime: '17:00', breakTimeMinutes: 60 },
      { day: WorkDay.SATURDAY, isWorkingDay: false, startTime: '09:00', endTime: '17:00', breakTimeMinutes: 60 },
    ];

    const defaultSettings = new this.companySettingsModel({
      workSettings: {
        dayWorkingHours: defaultDayWorkingHours,
        holidays: [],
        timezone: 'Asia/Riyadh',
        overtimeRate: 1.5,
        defaultBreakTimeMinutes: 60,
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
      isFirstTime: true,
    });

    return await defaultSettings.save();
  }

  async getWorkingDays(): Promise<WorkDay[]> {
    const settings = await this.getOrCreateSettings();
    return settings.workSettings.dayWorkingHours
      .filter(day => day.isWorkingDay)
      .map(day => day.day);
  }

  async getDayWorkingHours(): Promise<DayWorkingHours[]> {
    const settings = await this.getOrCreateSettings();
    return settings.workSettings.dayWorkingHours;
  }

  async updateDayWorkingHours(day: WorkDay, workingHours: Partial<DayWorkingHours>): Promise<CompanySettings | null> {
    const settings = await this.getOrCreateSettings();

    const dayIndex = settings.workSettings.dayWorkingHours.findIndex(d => d.day === day);
    if (dayIndex === -1) {
      throw new NotFoundException(`Working hours for ${day} not found`);
    }

    settings.workSettings.dayWorkingHours[dayIndex] = {
      ...settings.workSettings.dayWorkingHours[dayIndex],
      ...workingHours,
      day // Ensure day doesn't change
    };

    return await this.companySettingsModel
      .findByIdAndUpdate(
        settings._id,
        { 'workSettings.dayWorkingHours': settings.workSettings.dayWorkingHours },
        { new: true }
      )
      .exec();
  }

  async getOfficialWorkingHours(): Promise<number> {
    // Calculate average working hours per day from all working days
    const dayWorkingHours = await this.getDayWorkingHours();
    const workingDays = dayWorkingHours.filter(day => day.isWorkingDay);

    if (workingDays.length === 0) return 8; // Default fallback

    const totalHours = workingDays.reduce((total, day) => {
      const startTime = this.parseTime(day.startTime);
      const endTime = this.parseTime(day.endTime);
      const breakMinutes = day.breakTimeMinutes || 0;

      const workMinutes = (endTime.hours * 60 + endTime.minutes) -
        (startTime.hours * 60 + startTime.minutes) -
        breakMinutes;

      return total + (workMinutes / 60);
    }, 0);

    return totalHours / workingDays.length;
  }

  async getWorkingHoursForDay(day: WorkDay): Promise<number> {
    const dayWorkingHours = await this.getDayWorkingHours();
    const dayConfig = dayWorkingHours.find(d => d.day === day);

    if (!dayConfig || !dayConfig.isWorkingDay) return 0;

    const startTime = this.parseTime(dayConfig.startTime);
    const endTime = this.parseTime(dayConfig.endTime);
    const breakMinutes = dayConfig.breakTimeMinutes || 0;

    const workMinutes = (endTime.hours * 60 + endTime.minutes) -
      (startTime.hours * 60 + startTime.minutes) -
      breakMinutes;

    return workMinutes / 60;
  }

  private parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
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
    const dayWorkingHours = settings.workSettings.dayWorkingHours;
    const workingDays = dayWorkingHours.filter(day => day.isWorkingDay).map(day => day.day);
    const holidays = settings.workSettings.holidays || [];

    let workingDaysCount = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;
      const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday);
        return holidayDate.toDateString() === current.toDateString();
      });

      if (workingDays.includes(dayName) && !isHoliday) {
        workingDaysCount++;
      }

      current.setDate(current.getDate() + 1);
    }

    return workingDaysCount;
  }

  async calculateEstimatedHours(startDate: Date, endDate: Date): Promise<number> {
    const settings = await this.getOrCreateSettings();
    const dayWorkingHours = settings.workSettings.dayWorkingHours;
    const holidays = settings.workSettings.holidays || [];

    let totalHours = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }) as WorkDay;
      const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday);
        return holidayDate.toDateString() === current.toDateString();
      });

      if (!isHoliday) {
        const dayConfig = dayWorkingHours.find(day => day.day === dayName);
        if (dayConfig && dayConfig.isWorkingDay) {
          const hoursForDay = await this.getWorkingHoursForDay(dayName);
          totalHours += hoursForDay;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return totalHours;
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