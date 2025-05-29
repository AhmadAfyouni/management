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
  TIME_BASED = 'time_based',    // Based on estimated vs actual time
  DATE_BASED = 'date_based'     // Based on dates only
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
  @Prop({ type: [String], enum: WorkDay, default: [WorkDay.SUNDAY, WorkDay.MONDAY, WorkDay.TUESDAY, WorkDay.WEDNESDAY, WorkDay.THURSDAY] })
  workDays: WorkDay[];

  @Prop({ required: true, default: 8 })
  officialWorkingHoursPerDay: number;

  @Prop({ required: true, default: '09:00' })
  workStartTime: string;

  @Prop({ required: true, default: '17:00' })
  workEndTime: string;

  @Prop({ type: [Date], default: [] })
  holidays: Date[];// add event 

  @Prop({ required: true, default: 'Asia/Riyadh' })
  timezone: string;

  @Prop({ default: 1.5 })
  overtimeRate: number; // Multiplier for overtime pay

  @Prop({ default: 60 })
  breakTimeMinutes: number; // Default break time in minutes
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
  @Prop({ default: 10 }) // MB
  maxFileUploadSize: number;

  @Prop({ type: [String], default: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'] })
  allowedFileTypes: string[];

  // System Settings
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const CompanySettingsSchema = SchemaFactory.createForClass(CompanySettings);
