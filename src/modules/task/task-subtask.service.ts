import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubTaskDto, CreateTaskDto } from './dtos/create-task.dto';
import { Task, TaskDocument } from './schema/task.schema';
import { EmpService } from '../emp/emp.service';
import { SectionService } from '../section/section.service';
import { NotificationService } from '../notification/notification.service';
import { ProjectService } from '../project/project.service';
import { TaskValidationService } from './task-validation.service';
import { GetTaskDto } from './dtos/get-task.dto';
import { TASK_STATUS } from './enums/task-status.enum';

@Injectable()
export class TaskSubtaskService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private readonly empService: EmpService,
        private readonly sectionService: SectionService,
        private readonly projectService: ProjectService,
        private readonly notificationService: NotificationService,
        private readonly taskValidationService: TaskValidationService,
    ) { }

    async addSubtask(taskId: string, createSubTaskDto: CreateSubTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            const parentTask = await this.taskModel.findById(taskId)
                .populate('project_id')
                .populate('department_id')
                .populate('emp')
                .populate('assignee')
                .exec();

            if (!parentTask) {
                throw new NotFoundException('Parent task not found');
            }

            if (parentTask.status === TASK_STATUS.DONE) {
                throw new ConflictException("You cannot add sub task for this task because this task is Done");
            }

            if (parentTask.actual_hours && parentTask.actual_hours > 0) {
                throw new BadRequestException(
                    'Cannot add subtask to parent task that already has logged actual hours. Please remove logged hours first.'
                );
            }

            // Fix reference fields to always assign only the _id as string
            const getId = (val: any) => {
                if (!val) return undefined;
                if (typeof val === 'string') return val;
                if (val._id) return val._id.toString();
                return val.toString();
            };

            const createTaskDto: CreateTaskDto = {
                ...createSubTaskDto,
                project_id: getId(parentTask.project_id),
                department_id: getId(parentTask.department_id),
                emp: getId(createSubTaskDto.emp) || getId(parentTask.emp),
                assignee: getId(createSubTaskDto.assignee),
                section_id: getId(parentTask.section_id),
                parent_task: parentTask._id.toString(),
            };

            await this.taskValidationService.autoCalculateEstimatedHours(createTaskDto);
            // await this.taskValidationService.validateSubtaskDatesAgainstParent(createTaskDto, parentTask);

            let empId = getId(createSubTaskDto.emp) || getId(parentTask.emp);
            if (!empId) {
                throw new BadRequestException('No employee specified and parent task has no assigned employee');
            }

            const emp = await this.empService.findById(empId);
            if (!emp) {
                throw new NotFoundException('Employee not found');
            }

            await this.taskValidationService.validateEmployeeMembershipForSubtask(parentTask, emp, createTaskDto.assignee);

            if (parentTask.project_id) {
                createTaskDto.project_id = parentTask.project_id.toString();
                await this.taskValidationService.validateOngoingProjectRequirement(parentTask.project_id.toString());
                const project = await this.projectService.getProjectById(parentTask.project_id.toString());
                if (project) {
                    // await this.taskValidationService.validateTaskDatesAgainstProject(createTaskDto, project);
                }
                await this.taskValidationService.validateUniqueTaskNameInProject(createTaskDto.name, parentTask.project_id.toString());
            }

            await this.taskValidationService.validateTaskDatesWithWorkingHours(createTaskDto);
            await this.taskValidationService.validateAssigneeIsActive(empId);
            if (createTaskDto.assignee) {
                await this.taskValidationService.validateAssigneeIsActive(createTaskDto.assignee);
            }

            createTaskDto.emp = empId;
            createTaskDto.department_id = getId(parentTask.department_id) || getId(emp.department_id);

            const section = await this.sectionService.createInitialSections(empId) as any;
            createTaskDto.section_id = getId(section);

            const subtask = new this.taskModel(createTaskDto);
            await subtask.save();

            await this.taskModel.findByIdAndUpdate(
                parentTask._id,
                { $addToSet: { sub_tasks: subtask._id } },
                { new: true }
            );

            await this.notificationService.notifyTaskCreated(
                subtask,
                empId,
                subtask.assignee?.toString()
            );

            return {
                status: true,
                message: 'Subtask added successfully',
                data: subtask,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(error.message || 'Failed to add subtask');
        }
    }

    async getSubTasksByParentTask(parent_id: string): Promise<TaskDocument[]> {
        return this.taskModel.find({ parent_task: parent_id }).exec();
    }

    async getSubTaskByParentTask(parentId: string, empId: string) {
        try {
            const tasks = await this.taskModel.find({ parent_task: parentId })
                .populate([
                    { path: "emp", model: "Emp" },
                    { path: "assignee", model: "Emp" },
                    { path: "section_id" },
                    { path: "department_id" },
                    { path: "project_id" }
                ])
                .lean()
                .exec();

            return tasks.map((subTask) => new GetTaskDto(subTask));
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve subtasks', error.message);
        }
    }

    async canCompleteTask(id: string): Promise<boolean> {
        try {
            const task = await this.taskModel.findById(id).exec();
            if (!task) {
                throw new NotFoundException("Task not found");
            }

            const subTasks = await this.taskModel.find({ parent_task: id }).lean().exec();
            if (subTasks.length === 0) {
                return true;
            }

            const completedSubTasks = subTasks.filter(task => task.status === 'DONE');
            return completedSubTasks.length === subTasks.length;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to check task completion status', error.message);
        }
    }
}