import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, ValidateIf, ValidationArguments, registerDecorator, ValidationOptions } from 'class-validator';

// Custom decorator for validating recurring type and interval days
export function IsValidRecurringInterval(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidRecurringInterval',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const recurringType = obj.recurringType;
          const intervalDays = obj.intervalDays;

          if (!recurringType || !intervalDays) return true; // Let other validators handle required fields

          switch (recurringType) {
            case 'daily':
              return intervalDays >= 1 && intervalDays <= 365;
            case 'weekly':
              return intervalDays >= 7 && intervalDays <= 52 * 7;
            case 'monthly':
              return intervalDays >= 30 && intervalDays <= 12 * 30;
            case 'yearly':
              return intervalDays >= 365;
            default:
              return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const recurringType = obj.recurringType;
          
          switch (recurringType) {
            case 'daily':
              return 'For daily tasks, interval days must be between 1 and 365';
            case 'weekly':
              return 'For weekly tasks, interval days must be between 7 and 364';
            case 'monthly':
              return 'For monthly tasks, interval days must be between 30 and 360';
            case 'yearly':
              return 'For yearly tasks, interval days must be at least 365';
            default:
              return 'Invalid recurring type and interval combination';
          }
        },
      },
    });
  };
}

// Custom decorator for validating estimated hours based on recurring type
export function IsValidEstimatedHours(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidEstimatedHours',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const recurringType = obj.recurringType;
          const estimatedHours = obj.estimatedHours;

          if (!recurringType || estimatedHours === undefined) return true;

          // Set reasonable limits based on recurring type
          switch (recurringType) {
            case 'daily':
              return estimatedHours >= 0.25 && estimatedHours <= 8; // 15 min to 8 hours
            case 'weekly':
              return estimatedHours >= 0.5 && estimatedHours <= 40; // 30 min to 40 hours
            case 'monthly':
              return estimatedHours >= 1 && estimatedHours <= 160; // 1 hour to 160 hours
            case 'yearly':
              return estimatedHours >= 1 && estimatedHours <= 2000; // 1 hour to 2000 hours
            default:
              return estimatedHours >= 0;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const recurringType = obj.recurringType;
          
          switch (recurringType) {
            case 'daily':
              return 'For daily tasks, estimated hours should be between 0.25 and 8 hours';
            case 'weekly':
              return 'For weekly tasks, estimated hours should be between 0.5 and 40 hours';
            case 'monthly':
              return 'For monthly tasks, estimated hours should be between 1 and 160 hours';
            case 'yearly':
              return 'For yearly tasks, estimated hours should be between 1 and 2000 hours';
            default:
              return 'Estimated hours must be a positive number';
          }
        },
      },
    });
  };
}

// Extended validation DTO for routine tasks
export class ValidatedRoutineTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  recurringType: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsNumber()
  @Min(1)
  @IsValidRecurringInterval()
  intervalDays: number;

  @IsNumber()
  @Min(0)
  @IsValidEstimatedHours()
  @IsOptional()
  estimatedHours?: number;

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' = 'medium';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  instructions?: string[] = [];

  @IsBoolean()
  @IsOptional()
  hasSubTasks?: boolean = false;

  // Validate sub tasks only if hasSubTasks is true
  @ValidateIf(o => o.hasSubTasks === true)
  @IsArray()
  @IsNotEmpty({ message: 'Sub tasks are required when hasSubTasks is true' })
  subTasks?: Array<{
    name: string;
    description: string;
    estimatedHours?: number;
  }>;
}

// Validation DTO for job title with enhanced routine task validation
export class ValidatedJobTitleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  responsibilities: string[];

  @IsString()
  @IsNotEmpty()
  department_id: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsBoolean()
  @IsOptional()
  hasRoutineTasks?: boolean = false;

  // Validate routine tasks only if hasRoutineTasks is true
  @ValidateIf(o => o.hasRoutineTasks === true)
  @IsArray()
  @IsNotEmpty({ message: 'Routine tasks are required when hasRoutineTasks is true' })
  routineTasks?: ValidatedRoutineTaskDto[];

  @IsBoolean()
  @IsOptional()
  autoGenerateRoutineTasks?: boolean = true;
}

// DTO for bulk routine task validation
export class BulkRoutineTaskValidationDto {
  @IsArray()
  @IsNotEmpty()
  routineTasks: ValidatedRoutineTaskDto[];

  @IsBoolean()
  @IsOptional()
  validateDuplicateNames?: boolean = true;

  @IsBoolean()
  @IsOptional()
  validateTotalWorkload?: boolean = true;

  @IsNumber()
  @Min(1)
  @Max(168) // Max hours in a week
  @IsOptional()
  maxWeeklyHours?: number = 40;
}

// Response DTO for validation results
export class RoutineTaskValidationResultDto {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  duplicateNames: string[];
  totalEstimatedHours: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    total: number;
  };
  recommendedAdjustments: string[];

  constructor(data: any) {
    this.isValid = data.isValid || false;
    this.errors = data.errors || [];
    this.warnings = data.warnings || [];
    this.duplicateNames = data.duplicateNames || [];
    this.totalEstimatedHours = data.totalEstimatedHours || {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      total: 0
    };
    this.recommendedAdjustments = data.recommendedAdjustments || [];
  }
}
