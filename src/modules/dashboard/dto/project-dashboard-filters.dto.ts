import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TimeRange } from './dashboard-params.dto';

export class ProjectDashboardFiltersDto {
    @IsOptional()
    @IsEnum(TimeRange)
    timeRange?: TimeRange;

    @IsOptional()
    @IsString()
    projectId?: string;

    @IsOptional()
    @IsString()
    departmentId?: string;

    @IsOptional()
    @IsString()
    projectStatus?: string;

    @IsOptional()
    @IsString()
    healthStatus?: 'excellent' | 'good' | 'warning' | 'critical';

    @IsOptional()
    @IsString()
    sortBy?: 'name' | 'progress' | 'daysRemaining' | 'health';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc';
}
