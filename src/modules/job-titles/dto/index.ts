// Job Title DTOs
export * from './create-job-title.dto';
export * from './update-job-title.dto';
export * from './get-job-titles.dro';

// Routine Task DTOs
export * from './routine-task.dto';
export * from './routine-task-management.dto';
export * from './routine-task-validation.dto';

// Specific exports for convenience
export {
  CreateJobTitleDto
} from './create-job-title.dto';

export {
  GetJobTitlesDto
} from './get-job-titles.dro';

export {
  UpdateJobTitleDto,
  SimpleUpdateJobTitleDto,
  BaseUpdateJobTitleDto,
  AddRoutineTaskDto,
  RemoveRoutineTaskDto,
  UpdateRoutineTaskStatusDto,
  BulkUpdateRoutineTasksDto,
  ReplaceRoutineTasksDto,
  UpdateSpecificRoutineTaskDto
} from './update-job-title.dto';

export {
  CreateRoutineTaskDto,
  UpdateRoutineTaskDto,
  GetRoutineTaskDto,
  SubTaskDto
} from './routine-task.dto';

export {
  RoutineTaskTemplateDto,
  GetRoutineTasksQueryDto,
  RoutineTaskStatsDto,
  CopyRoutineTasksDto,
  GenerateRoutineTasksDto
} from './routine-task-management.dto';

export {
  ValidatedRoutineTaskDto,
  ValidatedJobTitleDto,
  BulkRoutineTaskValidationDto,
  RoutineTaskValidationResultDto,
  IsValidRecurringInterval,
  IsValidEstimatedHours
} from './routine-task-validation.dto';
