import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum TimeRange {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly'
}

export class DashboardParamsDto {
    @IsOptional()
    @IsEnum(TimeRange)
    timeRange?: TimeRange = TimeRange.WEEKLY;

    @IsOptional()
    @IsString()
    projectId?: string;

    @IsOptional()
    @IsString()
    departmentId?: string;
}

// 3. dashboard/interfaces/dashboard.interface.ts
