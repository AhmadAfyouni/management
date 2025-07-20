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

    private readonly defaultPopulateOptions = [
        {
            path: "emp",
            model: "Emp",
            populate: [
                {
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory",
                    },
                },
                {
                    path: "department_id",
                    model: "Department",
                },
            ],
        },
        {
            path: "assignee",
            model: "Emp",
            populate: [
                {
                    path: "job_id",
                    model: "JobTitles",
                    populate: {
                        path: "category",
                        model: "JobCategory",
                    },
                },
                {
                    path: "department_id",
                    model: "Department",
                },
            ],
        },
        { path: "section_id" },
        { path: "department_id" },
        { path: "project_id" }
    ];

    async createTaskForDepartment(createTaskDto: CreateTaskDto) {
        if (!createTaskDto.department_id) {
            throw new BadRequestException('Department ID is required');
        }

        const manager = await this.empService.findManagerByDepartment(createTaskDto.department_id);
        if (!manager) {
            throw new NotFoundException("this department does not have manager");
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
            throw new InternalServerErrorException('Failed to create Task', error.message);
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
                throw new NotFoundException("this department does not have manager");
            }


            // Validate project existence
            const project = await this.projectModel.findById(createTaskDto.project_id);
            if (!project) {
                throw new NotFoundException(`Project with ID ${createTaskDto.project_id} not found`);
            }
            await this.taskValidationService.validateTaskDatesAgainstProject(createTaskDto, project);

            // Check if employee's department is part of the project
            if (!project.departments.map((dept) => dept.toString()).includes(createTaskDto.department_id)) {
                throw new ForbiddenException('Employee’s department is not associated with this project');
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
            // Fetch tasks without populate to avoid casting issues
            const tasks = await this.taskModel.find({})
                .lean()
                .exec();

            // Get all unique IDs for batch fetching related data
            const empIds = new Set<string>();
            const departmentIds = new Set<string>();
            const projectIds = new Set<string>();
            const sectionIds = new Set<string>();

            tasks.forEach(task => {
                if (task.emp) empIds.add(task.emp.toString());
                if (task.assignee) empIds.add(task.assignee.toString());
                if (task.department_id) departmentIds.add(task.department_id.toString());
                if (task.project_id) projectIds.add(task.project_id.toString());
                if (task.section_id) sectionIds.add(task.section_id.toString());
            });

            // Batch fetch related data
            const [employees, departments, projects, sections] = await Promise.all([
                empIds.size > 0 ? this.empModel.find({ _id: { $in: Array.from(empIds) } }).lean().exec() : [],
                departmentIds.size > 0 ? this.departmentModel.find({ _id: { $in: Array.from(departmentIds) } }).lean().exec() : [],
                projectIds.size > 0 ? this.projectModel.find({ _id: { $in: Array.from(projectIds) } }).lean().exec() : [],
                sectionIds.size > 0 ? this.sectionModel.find({ _id: { $in: Array.from(sectionIds) } }).lean().exec() : []
            ]);

            // Create lookup maps for quick access
            const empMap = new Map((employees as any).map(emp => [emp._id.toString(), emp]));
            const deptMap = new Map((departments as any).map(dept => [dept._id.toString(), dept]));
            const projMap = new Map((projects as any).map(proj => [proj._id.toString(), proj]));
            const sectionMap = new Map((sections as any).map(section => [section._id.toString(), section]));

            // Process tasks and attach related data
            const tasksDto = tasks.map(task => {
                const processedTask = { ...task } as any;

                // Attach employee data
                if (task.emp) {
                    const empData = empMap.get(task.emp.toString());
                    processedTask.emp = empData || null;
                }

                if (task.assignee) {
                    const assigneeData = empMap.get(task.assignee.toString());
                    processedTask.assignee = assigneeData || null;
                }

                // Attach organization data
                if (task.department_id) {
                    const deptData = deptMap.get(task.department_id.toString());
                    processedTask.department_id = deptData || task.department_id.toString();
                }

                if (task.project_id) {
                    const projData = projMap.get(task.project_id.toString());
                    processedTask.project_id = projData || task.project_id.toString();
                }

                if (task.section_id) {
                    const sectionData = sectionMap.get(task.section_id.toString());
                    processedTask.section_id = sectionData || task.section_id.toString();
                }

                // Ensure proper ID conversion for arrays
                if (processedTask.sub_tasks && Array.isArray(processedTask.sub_tasks)) {
                    processedTask.sub_tasks = processedTask.sub_tasks.map(id => id.toString());
                }

                if (processedTask.dependencies && Array.isArray(processedTask.dependencies)) {
                    processedTask.dependencies = processedTask.dependencies.map(id => id.toString());
                }

                if (processedTask.parent_task) {
                    processedTask.parent_task = processedTask.parent_task.toString();
                }

                return new GetTaskDto(processedTask);
            });

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
            // Fetch task without populate to avoid casting issues
            const task = await this.taskModel.findById(id).lean().exec();

            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            // Safely collect IDs for batch fetching
            const empIds = new Set<string>();
            const departmentIds = new Set<string>();
            const projectIds = new Set<string>();
            const sectionIds = new Set<string>();

            // Safe helper function to add IDs
            const safeAddId = (value: any, collection: Set<string>) => {
                if (value) {
                    const id = typeof value === 'string' ? value : value.toString();
                    if (id && id !== 'undefined' && id !== 'null') {
                        collection.add(id);
                    }
                }
            };

            safeAddId(task.emp, empIds);
            safeAddId(task.assignee, empIds);
            safeAddId(task.department_id, departmentIds);
            safeAddId(task.project_id, projectIds);
            safeAddId(task.section_id, sectionIds);

            // Fetch all subtasks first to collect their IDs too
            const allSubtasks = await this.getAllSubtasksFlat(id);
            allSubtasks.forEach(subtask => {
                safeAddId(subtask.emp, empIds);
                safeAddId(subtask.assignee, empIds);
                safeAddId(subtask.department_id, departmentIds);
                safeAddId(subtask.project_id, projectIds);
                safeAddId(subtask.section_id, sectionIds);
            });

            // Batch fetch related data
            const [employees, departments, projects, sections]: any = await Promise.all([
                empIds.size > 0 ? this.empModel.find({ _id: { $in: Array.from(empIds) } }).lean().exec() : [],
                departmentIds.size > 0 ? this.departmentModel.find({ _id: { $in: Array.from(departmentIds) } }).lean().exec() : [],
                projectIds.size > 0 ? this.projectModel.find({ _id: { $in: Array.from(projectIds) } }).lean().exec() : [],
                sectionIds.size > 0 ? this.sectionModel.find({ _id: { $in: Array.from(sectionIds) } }).lean().exec() : []
            ]);

            // Create lookup maps
            const empMap: any = new Map(employees.map((emp: any) => [emp._id.toString(), emp]));
            const deptMap: any = new Map(departments.map((dept: any) => [dept._id.toString(), dept]));
            const projMap: any = new Map(projects.map((proj: any) => [proj._id.toString(), proj]));
            const sectionMap: any = new Map(sections.map((section: any) => [section._id.toString(), section]));

            // Enrich main task
            const enrichedTask = this.enrichSingleTask(task, empMap, deptMap, projMap, sectionMap);

            // Build subtask hierarchy
            const subtasks = this.buildSubtaskHierarchy(allSubtasks, id, empMap, deptMap, projMap, sectionMap);
            const taskWithSubtasks = { ...enrichedTask, subtasks };

            const taskDto = new GetTaskDto(taskWithSubtasks);

            return { status: true, message: 'Task retrieved successfully', data: taskDto };
        } catch (error) {
            console.error('Error in getTaskById:', error);

            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve task', error.message);
        }
    }

    /**
     * Get all subtasks in a flat structure
     */
    private async getAllSubtasksFlat(parentId: string): Promise<any[]> {
        const allSubtasks: any[] = [];
        const visited = new Set<string>();

        const fetchLevel = async (currentParentId: string) => {
            if (visited.has(currentParentId)) {
                return; // Prevent infinite loops
            }
            visited.add(currentParentId);

            const subtasks = await this.taskModel.find({ parent_task: currentParentId }).lean().exec();

            for (const subtask of subtasks) {
                allSubtasks.push(subtask);
                await fetchLevel(subtask._id.toString());
            }
        };

        await fetchLevel(parentId);
        return allSubtasks;
    }

    /**
     * Build subtask hierarchy from flat list
     */
    private buildSubtaskHierarchy(
        allSubtasks: any[],
        parentId: string,
        empMap: Map<string, any>,
        deptMap: Map<string, any>,
        projMap: Map<string, any>,
        sectionMap: Map<string, any>
    ): any[] {
        const directSubtasks = allSubtasks.filter(task =>
            task.parent_task && task.parent_task.toString() === parentId
        );

        return directSubtasks.map(subtask => {
            const enrichedSubtask = this.enrichSingleTask(subtask, empMap, deptMap, projMap, sectionMap);
            const nestedSubtasks = this.buildSubtaskHierarchy(
                allSubtasks,
                subtask._id.toString(),
                empMap,
                deptMap,
                projMap,
                sectionMap
            );
            return { ...enrichedSubtask, subtasks: nestedSubtasks };
        });
    }

    /**
     * Safely enrich a single task with related data
     */
    private enrichSingleTask(
        task: any,
        empMap: Map<string, any>,
        deptMap: Map<string, any>,
        projMap: Map<string, any>,
        sectionMap: Map<string, any>
    ): any {
        const enrichedTask = { ...task };

        // Safe helper to get ID string
        const safeGetId = (value: any): string | null => {
            if (!value) return null;
            if (typeof value === 'string') return value;
            if (value._id) return value._id.toString();
            if (typeof value.toString === 'function') return value.toString();
            return null;
        };

        // Safe helper to get related data
        const safeGetRelatedData = (value: any, map: Map<string, any>) => {
            const id = safeGetId(value);
            return id ? map.get(id) : null;
        };

        // Attach employee data
        const empData = safeGetRelatedData(task.emp, empMap);
        enrichedTask.emp = empData || null;

        const assigneeData = safeGetRelatedData(task.assignee, empMap);
        enrichedTask.assignee = assigneeData || null;

        // Attach organization data (return populated object or ID string)
        const deptData = safeGetRelatedData(task.department_id, deptMap);
        enrichedTask.department_id = deptData || safeGetId(task.department_id);

        const projData = safeGetRelatedData(task.project_id, projMap);
        enrichedTask.project_id = projData || safeGetId(task.project_id);

        const sectionData = safeGetRelatedData(task.section_id, sectionMap);
        enrichedTask.section_id = sectionData || safeGetId(task.section_id);

        // Handle arrays safely
        enrichedTask.sub_tasks = Array.isArray(task.sub_tasks)
            ? task.sub_tasks.map(id => safeGetId(id)).filter(id => id !== null)
            : [];

        enrichedTask.dependencies = Array.isArray(task.dependencies)
            ? task.dependencies.map(id => safeGetId(id)).filter(id => id !== null)
            : [];

        // Handle parent task
        enrichedTask.parent_task = safeGetId(task.parent_task);

        // Ensure other fields are safe
        enrichedTask.files = Array.isArray(task.files) ? task.files : [];
        enrichedTask.timeLogs = Array.isArray(task.timeLogs) ? task.timeLogs : [];

        return enrichedTask;
    }
    private async fetchSubtasksRecursively(parentId: string): Promise<any[]> {
        const subtasks = await this.taskModel.find({ parent_task: parentId })
            .populate(this.defaultPopulateOptions)
            .lean()
            .exec();


        return subtasks;
    }

    async updateTask(id: string, updateTaskDto: UpdateTaskDto, empId: string): Promise<{ status: boolean; message: string }> {
        try {
            const task = await this.taskModel.findById(new Types.ObjectId(id))
                .populate('project_id')
                .exec();

            if (!task) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }

            const oldStatus = task.status;
            // await this.taskValidationService.validateTaskUpdate(task, updateTaskDto, empId);

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
            const result = await this.taskModel.findByIdAndDelete(id).exec();
            if (!result) {
                throw new NotFoundException(`Task with ID ${id} not found`);
            }
            return { status: true, message: 'Task deleted successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to delete task');
        }
    }
}