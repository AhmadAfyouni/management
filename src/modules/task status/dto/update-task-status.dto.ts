import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskStatusDto } from './create-task-status.dto';

export class UpdateTaskStatusDto extends PartialType(CreateTaskStatusDto) {}
