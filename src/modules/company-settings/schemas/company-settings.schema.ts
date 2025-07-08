import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanySettingsDocument = CompanySettings & Document;

export enum WorkDay {
  SUNDAY = 'Sunday',
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday'
}

export enum ProgressCalculationMethod {
  TIME_BASED = 'time_based',
  DATE_BASED = 'date_based'
}

@Schema()
export class DayWorkingHours {
  @Prop({ required: true })
  day: WorkDay;

  @Prop({ required: true })
  isWorkingDay: boolean;

  @Prop({ required: true, default: '09:00' })
  startTime: string;

  @Prop({ required: true, default: '17:00' })
  endTime: string;

  @Prop({ default: 60 })
  breakTimeMinutes: number;
}

@Schema()
export class TaskFieldSettings {
  @Prop({ default: true })
  enableEstimatedTime: boolean;

  @Prop({ default: true })
  enableActualTime: boolean;

  @Prop({ default: true })
  enablePriority: boolean;

  @Prop({ default: true })
  enableDueDate: boolean;

  @Prop({ default: true })
  enableFiles: boolean;

  @Prop({ default: true })
  enableComments: boolean;

  @Prop({ default: true })
  enableSubTasks: boolean;

  @Prop({ default: true })
  enableTimeTracking: boolean;

  @Prop({ default: true })
  enableRecurring: boolean;

  @Prop({ default: true })
  enableDependencies: boolean;
}

@Schema()
export class WorkSettings {
  @Prop({ type: [DayWorkingHours], required: true })
  dayWorkingHours: DayWorkingHours[];

  @Prop({ type: [Date], default: [] })
  holidays: Date[];

  @Prop({ required: true, default: 'Asia/Riyadh' })
  timezone: string;

  @Prop({ default: 1.5 })
  overtimeRate: number;

  @Prop({ default: 60 })
  defaultBreakTimeMinutes: number; // Default break time for new working days
}

@Schema({
  timestamps: true,
  collection: 'company_settings'
})
export class CompanySettings {
  @Prop({ type: WorkSettings, required: true })
  workSettings: WorkSettings;

  @Prop({ type: TaskFieldSettings, required: true })
  taskFieldSettings: TaskFieldSettings;

  @Prop({ enum: ProgressCalculationMethod, default: ProgressCalculationMethod.TIME_BASED })
  progressCalculationMethod: ProgressCalculationMethod;

  // Task Management Settings
  @Prop({ default: true })
  allowTaskDuplication: boolean;

  @Prop({ default: false })
  requireTaskApproval: boolean;

  @Prop({ default: true })
  autoGenerateTaskIds: boolean;

  @Prop({ default: 5 })
  defaultTaskReminderDays: number;

  // Notification Settings
  @Prop({ default: true })
  enableEmailNotifications: boolean;

  @Prop({ default: true })
  enablePushNotifications: boolean;

  @Prop({ default: true })
  enableTaskDeadlineReminders: boolean;

  @Prop({ default: true })
  enableProjectDeadlineReminders: boolean;

  // File Management Settings
  @Prop({ default: 10 })
  maxFileUploadSize: number;

  @Prop({ type: [String], default: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'] })
  allowedFileTypes: string[];

  // System Settings
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastUpdated: Date;

  // New attribute to denote first time entry
  @Prop({ default: true })
  isFirstTime: boolean;
}

export const CompanySettingsSchema = SchemaFactory.createForClass(CompanySettings);
export const DayWorkingHoursSchema = SchemaFactory.createForClass(DayWorkingHours);