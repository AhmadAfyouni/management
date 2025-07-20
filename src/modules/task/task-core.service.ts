import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { GetTaskDto } from './dtos/get-task.dto';
import { Task, TaskDocument } from './schema/task.schema';
import { EmpService } from '../emp/emp.service';
import { SectionService } from '../section/section.service';
import { NotificationService } from '../notification/notification.service';
import { TaskValidationService } from './task-validation.service';
import { Project, ProjectDocument } from '../project/schema/project.schema';
import { Emp, EmpDocument } from '../emp/schemas/emp.schema';
import { Department, DepartmentDocument } from '../department/schema/department.schema';
import { Section, SectionDocument } from '../section/schemas/section.schema';

@Injectable()
export class TaskCoreService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
        private readonly empService: EmpService,
        private readonly sectionService: SectionService,
        private readonly notificationService: NotificationService,
        private readonly taskValidationService: TaskValidationService,
    ) { }

    // ==================== UTILITY METHODS ====================

    /**
     * Safely extract ObjectId string from any value
     */
    private safeToObjectIdString(value: any): string | null {
        if (!value) return null;

        try {
            // If it's already a valid ObjectId string
            if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
                return value;
            }

            // If it's an ObjectId object
            if (value instanceof Types.ObjectId) {
                return value.toString();
            }

            // If it's an object with _id
            if (typeof value === 'object' && value._id) {
                const id = value._id;
                if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
                    return id;
                }
                if (id instanceof Types.ObjectId) {
                    return id.toString();
                }
            }

            // If it's a stringified object (corrupted data), try to extract ObjectId
            if (typeof value === 'string' && value.includes('ObjectId(')) {
                const match = value.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // Try to convert to string and validate
            const stringValue = value.toString();
            if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
                return stringValue;
            }

            return null;
        } catch (error) {
            console.warn('Error converting value to ObjectId string:', error);
            return null;
        }
    }

    /**
     * Safely convert array of values to ObjectId strings
     */
    private safeArrayToObjectIdStrings(arr: any[]): string[] {
        if (!Array.isArray(arr)) return [];

        return arr
            .map(item => this.safeToObjectIdString(item))
            .filter((id): id is string => id !== null);
    }

    /**
     * Clean corrupted task data
     */
    private cleanTaskData(task: any): any {
        if (!task) return null;

        const cleaned = {
            _id: task._id,
            name: task.name || '',
            description: task.description || '',
            priority: task.priority,
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            due_date: task.due_date,
            start_date: task.start_date,
            actual_end_date: task.actual_end_date,
            expected_end_date: task.expected_end_date,
            estimated_hours: task.estimated_hours || 0,
            actual_hours: task.actual_hours || 0,
            totalTimeSpent: task.totalTimeSpent || 0,
            startTime: task.startTime,
            timeLogs: Array.isArray(task.timeLogs) ? task.timeLogs : [],
            files: Array.isArray(task.files) ? task.files : [],
            progress: task.progress || 0,
            progressCalculationMethod: task.progressCalculationMethod || 'time_based',
            hasLoggedHours: task.hasLoggedHours || false,
            isActive: task.isActive !== undefined ? task.isActive : true,
            isRecurring: task.isRecurring || false,
            recurringType: task.recurringType,
            intervalInDays: task.intervalInDays,
            recurringEndDate: task.recurringEndDate,
            isRoutineTask: task.isRoutineTask || false,
            routineTaskId: task.routineTaskId,
            boardPosition: task.boardPosition,
            boardOrder: task.boardOrder,
            over_all_time: task.over_all_time,
            rate: task.rate,
            comment: task.comment,
            end_date: task.end_date,

            // Clean reference fields
            emp: this.safeToObjectIdString(task.emp),
            assignee: this.safeToObjectIdString(task.assignee),
            department_id: this.safeToObjectIdString(task.department_id),
            project_id: this.safeToObjectIdString(task.project_id),
            section_id: this.safeToObjectIdString(task.section_id),
            parent_task: this.safeToObjectIdString(task.parent_task),

            // Clean arrays
            sub_tasks: this.safeArrayToObjectIdStrings(task.sub_tasks || []),
            dependencies: this.safeArrayToObjectIdStrings(task.dependencies || [])
        };

        return cleaned;
    }

    /**
     * Batch fetch and create lookup maps for related data
     */
    private async fetchRelatedData(tasks: any[]) {
        // Collect all unique IDs
        const empIds = new Set<string>();
        const departmentIds = new Set<string>();
        const projectIds = new Set<string>();
        const sectionIds = new Set<string>();

        tasks.forEach(task => {
            if (task.emp) empIds.add(task.emp);
            if (task.assignee) empIds.add(task.assignee);
            if (task.department_id) departmentIds.add(task.department_id);
            if (task.project_id) projectIds.add(task.project_id);
            if (task.section_id) sectionIds.add(task.section_id);
        });

        // Batch fetch all related data
        const [employees, departments, projects, sections]: any = await Promise.all([
            empIds.size > 0 ? this.empModel.find({ _id: { $in: Array.from(empIds) } }).lean().exec() : [],
            departmentIds.size > 0 ? this.departmentModel.find({ _id: { $in: Array.from(departmentIds) } }).lean().exec() : [],
            projectIds.size > 0 ? this.projectModel.find({ _id: { $in: Array.from(projectIds) } }).lean().exec() : [],
            sectionIds.size > 0 ? this.sectionModel.find({ _id: { $in: Array.from(sectionIds) } }).lean().exec() : []
        ]);

        // Create lookup maps
        return {
            empMap: new Map(employees.map((emp: any) => [emp._id.toString(), emp])),
            deptMap: new Map(departments.map((dept: any) => [dept._id.toString(), dept])),
            projMap: new Map(projects.map((proj: any) => [proj._id.toString(), proj])),
            sectionMap: new Map(sections.map((section: any) => [section._id.toString(), section]))
        };
    }

    /**
     * Enrich task with related data
     */
    private enrichTask(task: any, maps: any): any {
        const enriched = { ...task };

        // Attach employee data
        if (task.emp) {
            const empData = maps.empMap.get(task.emp);
            enriched.emp = empData || null;
        } else {
            enriched.emp = null;
        }

        if (task.assignee) {
            const assigneeData = maps.empMap.get(task.assignee);
            enriched.assignee = assigneeData || null;
        } else {
            enriched.assignee = null;
        }

        // Attach organization data (return object if found, otherwise keep ID)
        if (task.department_id) {
            const deptData = maps.deptMap.get(task.department_id);
            enriched.department_id = deptData || task.department_id;
        }

        if (task.project_id) {
            const projData = maps.projMap.get(task.project_id);
            enriched.project_id = projData || task.project_id;
        }

        if (task.section_id) {
            const sectionData = maps.sectionMap.get(task.section_id);
            enriched.section_id = sectionData || task.section_id;
        }

        return enriched;
    }

    // ==================== MAIN METHODS ====================

    async createTaskForDepartment(createTaskDto: CreateTaskDto) {
        try {
            if (!createTaskDto.department_id) {
                throw new BadRequestException('Department ID is required');
            }

            const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
            if (!manager) {
                throw new NotFoundException("This department does not have a manager");
            }

            await this.taskValidationService.autoCalculateEstimatedHours(createTaskDto);
            await this.taskValidationService.validateTaskDatesWithWorkingHours(createTaskDto);

            const section = await this.sectionService.createInitialSections(manager._id.toString()) as any;
            createTaskDto.section_id = section._id.toString();

            const taskData = {
                ...createTaskDto,
                emp: manager._id.toString(),
                department_id: createTaskDto.department_id,
            };

            const task = new this.taskModel(taskData);
            const savedTask = await task.save();

            await this.notificationService.notifyTaskCreated(
                savedTask,
                manager._id.toString(),
                savedTask.assignee?.toString()
            );

            return savedTask;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create task for department', error.message);
        }
    }

    async createTaskForEmp(createTaskDto: CreateTaskDto): Promise<{ status: boolean, message: string, data?: Task }> {
        try {
            if (!createTaskDto.emp) {
                throw new BadRequestException('Employee ID is required');
            }

            const departmentId = await this.empService.findDepartmentIdByEmpId(createTaskDto.emp);
            if (!departmentId) {
                throw new NotFoundException('Department ID not found for this employee');
            }

            await this.taskValidationService.autoCalculateEstimatedHours(createTaskDto);
            await this.taskValidationService.validateTaskDatesWithWorkingHours(createTaskDto);

            await this.sectionService.createInitialSections(createTaskDto.emp);
            const section_id = await this.sectionService.getRecentlySectionId(createTaskDto.emp);
            createTaskDto.section_id = section_id;

            const task = new this.taskModel({
                ...createTaskDto,
                department_id: departmentId,
            });
            const savedTask = await task.save();

            await this.notificationService.notifyTaskCreated(
                savedTask,
                createTaskDto.emp,
                savedTask.assignee?.toString()
            );

            return { status: true, message: 'Task created successfully', data: savedTask };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create task', error.message);
        }
    }

    async createTaskForProject(createTaskDto: CreateTaskDto): Promise<{ status: boolean; message: string; data?: Task }> {
        try {
            if (!createTaskDto.project_id) {
                throw new BadRequestException('Project ID is required');
            }
            if (!createTaskDto.department_id) {
                throw new BadRequestException('Department ID is required');
            }

            const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
            if (!manager) {
                throw new NotFoundException("This department does not have a manager");
            }

            // Validate project existence
            const project = await this.projectModel.findById(createTaskDto.project_id);
            if (!project) {
                throw new NotFoundException(`Project with ID ${createTaskDto.project_id} not found`);
            }

            await this.taskValidationService.validateTaskDatesAgainstProject(createTaskDto, project);

            // Check if employee's department is part of the project
            if (!project.departments.map(dept => dept.toString()).includes(createTaskDto.department_id)) {
                throw new ForbiddenException('Employee department is not associated with this project');
            }

            // Validate task data
            await this.taskValidationService.autoCalculateEstimatedHours(createTaskDto);
            await this.taskValidationService.validateTaskDatesWithWorkingHours(createTaskDto);

            // Assign section
            await this.sectionService.createInitialSections(manager._id.toString());
            const section_id = await this.sectionService.getRecentlySectionId(manager._id.toString());
            createTaskDto.section_id = section_id;

            // Create task
            const task = new this.taskModel({
                ...createTaskDto,
                department_id: createTaskDto.department_id,
                project_id: new Types.ObjectId(createTaskDto.project_id),
                emp: manager._id.toString()
            });
            const savedTask = await task.save();

            // Send notification
            await this.notificationService.notifyTaskCreated(
                savedTask,
                manager._id.toString(),
                savedTask.assignee?.toString(),
            );

            return { status: true, message: 'Task created successfully for project', data: savedTask };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create task for project', error.message);
        }
    }

    async getAllTasks(): Promise<{ status: boolean, message: string, data: GetTaskDto[] }> {
        try {
            // Fetch all tasks without populate
            const rawTasks = await this.taskModel.find({}).lean().exec();

            // Clean all tasks
            const cleanedTasks = rawTasks.map(task => this.cleanTaskData(task)).filter(task => task !== null);

            // Fetch related data
            const maps = await this.fetchRelatedData(cleanedTasks);

            // Enrich tasks with related data
            const enrichedTasks = cleanedTasks.map(task => this.enrichTask(task, maps));

            // Convert to DTOs
            const tasksDto = enrichedTasks.map(task => {
                try {
                    return new GetTaskDto(task);
                } catch (error) {
                    console.error(`Error creating DTO for task ${task._id}:`, error);
                    return null;
                }
            }).filter((dto): dto is GetTaskDto => dto !== null);

            return {
                status: true,
                message: 'Tasks retrieved successfully',
                data: tasksDto
            };
        } catch (error) {
            console.error('Error in getAllTasks:', error);
            throw new InternalServerErrorException('Failed to retrieve tasks', error.message);
        }
    }

    async getTaskById(id: string): Promise<{ status: boolean, message: string, data?: any }> {
        try {
            // Validate ObjectId
            if (!Types.ObjectId.isValid(id)) {
                throw new BadRequestException('Invalid task ID format');
            }

            // Fetch main task
            const rawTask = await this.taskModel.findById(id).lean().exec();
            if (!rawTask) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            // Clean main task
            const cleanedTask = this.cleanTaskData(rawTask);
            if (!cleanedTask) {
                throw new InternalServerErrorException('Failed to process task data');
            }

            // Fetch all subtasks recursively
            const allSubtasks = await this.fetchAllSubtasks(id);
            const cleanedSubtasks = allSubtasks.map(task => this.cleanTaskData(task)).filter(task => task !== null);

            // Fetch related data for all tasks
            const allTasks = [cleanedTask, ...cleanedSubtasks];
            const maps = await this.fetchRelatedData(allTasks);

            // Enrich main task
            const enrichedTask = this.enrichTask(cleanedTask, maps);

            // Build subtask hierarchy
            const enrichedSubtasks = cleanedSubtasks.map(task => this.enrichTask(task, maps));
            const subtasks = this.buildSubtaskHierarchy(enrichedSubtasks, id);

            // Combine task with subtasks
            const taskWithSubtasks = { ...enrichedTask, subtasks };

            // Create DTO
            const taskDto = new GetTaskDto(taskWithSubtasks);

            return {
                status: true,
                message: 'Task retrieved successfully',
                data: taskDto
            };
        } catch (error) {
            console.error('Error in getTaskById:', error);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve task', error.message);
        }
    }

    /**
     * Fetch all subtasks for a given parent task ID
     */
    private async fetchAllSubtasks(parentId: string): Promise<any[]> {
        const allSubtasks: any[] = [];
        const processedIds = new Set<string>();

        const fetchLevel = async (currentParentId: string) => {
            if (processedIds.has(currentParentId)) {
                return; // Prevent infinite loops
            }
            processedIds.add(currentParentId);

            try {
                const subtasks = await this.taskModel.find({
                    parent_task: currentParentId
                }).lean().exec();

                for (const subtask of subtasks) {
                    allSubtasks.push(subtask);
                    await fetchLevel(subtask._id.toString());
                }
            } catch (error) {
                console.warn(`Error fetching subtasks for parent ${currentParentId}:`, error.message);
            }
        };

        await fetchLevel(parentId);
        return allSubtasks;
    }

    /**
     * Build subtask hierarchy from flat list
     */
    private buildSubtaskHierarchy(subtasks: any[], parentId: string): any[] {
        const directChildren = subtasks.filter(task =>
            task.parent_task === parentId
        );

        return directChildren.map(child => {
            const childSubtasks = this.buildSubtaskHierarchy(subtasks, child._id.toString());
            return { ...child, subtasks: childSubtasks };
        });
    }

    async updateTask(id: string, updateTaskDto: UpdateTaskDto, empId: string): Promise<{ status: boolean; message: string }> {
        try {
            if (!Types.ObjectId.isValid(id)) {
                throw new BadRequestException('Invalid task ID format');
            }

            const task = await this.taskModel.findById(id).exec();
            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            const oldStatus = task.status;

            const updatedTask = await this.taskModel
                .findByIdAndUpdate(id, updateTaskDto, { new: true })
                .exec();

            if (!updatedTask) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            if (updateTaskDto.status && oldStatus !== updateTaskDto.status) {
                await this.notificationService.notifyTaskStatusChanged(updatedTask, empId);
            }

            return { status: true, message: 'Task updated successfully' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update task', error.message);
        }
    }

    async deleteTask(id: string): Promise<{ status: boolean, message: string }> {
        try {
            if (!Types.ObjectId.isValid(id)) {
                throw new BadRequestException('Invalid task ID format');
            }

            const result = await this.taskModel.findByIdAndDelete(id).exec();
            if (!result) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            return { status: true, message: 'Task deleted successfully' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to delete task', error.message);
        }
    }
}