import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseObject } from 'src/helper/parse-object';
import { EmpService } from '../emp/emp.service';
import { TASK_STATUS } from '../task/enums/task-status.enum';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { ProjectStatus } from './enums/project-status';
import { Project, ProjectDocument } from './schema/project.schema';
import { TaskQueryService } from '../task/task-query.service';
import { DepartmentService } from '../department/depratment.service';
import { Task } from '../task/schema/task.schema';

@Injectable()
export class ProjectService {
    constructor(
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        private readonly empService: EmpService,
        @Inject(forwardRef(() => TaskQueryService))
        private readonly taskQueryService: TaskQueryService,
        private readonly departmentService: DepartmentService,
    ) { }


    async getContributorsProject(projectId: string) {
        const project = await this.projectModel.findById(parseObject(projectId)).populate('departments').lean().exec();
        const deparmentsId = project?.departments;
        let mangers;
        if (deparmentsId) {
            mangers = deparmentsId.map(async (department) =>
                await this.empService.findManagerByDepartment(department.toString()),
            );
        }
        return { mangers };
    }

    async getAllProject() {
        return await this.projectModel.find().populate('departments').exec();
    }

    async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
        try {
            const project = new this.projectModel(createProjectDto) as any;
            return await project.save();
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to create project');
        }
    }

    async getProjectsByDepartment(departmentId: string): Promise<Project[]> {
        return await this.projectModel.find({ departments: { $in: departmentId } }).populate('departments').exec();
    }

    async getProjectById(id: string): Promise<Project> {
        const project = await this.projectModel.findById(parseObject(id)).populate('departments').exec();
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }

    async getEmpProject(empId: string) {
        return await this.projectModel.find({ members: { $in: [empId] } }).populate('departments').lean().exec();
    }

    async getManagerProject(departmentId: string) {
        return await this.projectModel.find({ departments: { $in: departmentId } }).populate('departments').lean().exec();
    }

    async updateProject(id: string, updateProjectDto: UpdateProjectDto, empId: string): Promise<Project> {
        try {
            const project = await this.projectModel.findById(new Types.ObjectId(id)).lean().exec();
            if (!project) {
                throw new NotFoundException(`Project with ID ${id} not found`);
            }
            if (empId !== project.assignee?.toString()) {
                throw new ForbiddenException('You are not authorized to update this project');
            }
            const updateFields: any = {};
            if (updateProjectDto.status === ProjectStatus.COMPLETED) {
                const tasks = await this.taskQueryService.getProjectTaskDetails(id);
                const completedTasks = tasks.filter((task) => task.status === TASK_STATUS.DONE || task.status === TASK_STATUS.CLOSED || task.status === TASK_STATUS.CANCELED);
                if (tasks.length !== completedTasks.length) {
                    throw new BadRequestException('Project cannot be marked as completed because some tasks are not completed');
                }
            }
            if (updateProjectDto.departments) {
                const existingProject = await this.projectModel.findById(id).exec();
                if (!existingProject) {
                    throw new NotFoundException(`Project with ID ${id} not found`);
                }

                const existingDepartments = existingProject.departments.map((deptId: any) => deptId.toString());
                const newDepartments = updateProjectDto.departments.map((deptId) => deptId.toString());
                const mergedDepartments = Array.from(new Set([...existingDepartments, ...newDepartments]));
                updateFields.departments = mergedDepartments;
            }

            const updatedProject = await this.projectModel
                .findByIdAndUpdate(id, { $set: { ...updateProjectDto, ...updateFields } }, { new: true })
                .exec();

            if (!updatedProject) {
                throw new NotFoundException(`Project with ID ${id} not found`);
            }

            return updatedProject;
        } catch (error) {
            console.log(error);
            throw new BadRequestException(error.message || 'Failed to update project');
        }
    }

    async canCompleteProject(id: string): Promise<boolean> {
        const project = await this.projectModel.findById(new Types.ObjectId(id)).exec();
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        const tasks = await this.taskQueryService.getProjectTaskDetails(id);
        const completedTasks = tasks.filter((task) => task.status === TASK_STATUS.DONE).length;
        return tasks.length === completedTasks;
    }

    async deleteProject(id: string): Promise<void> {
        const result = await this.projectModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
    }

    async getProjectDetails(id: string, departmentId: string) {
        const project = await this.projectModel.findById(parseObject(id)).populate('departments').lean().exec() as any;
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        if (project?.departments) {
            project.departments = project.departments.map((department) => ({
                id: department._id.toString(),
                name: department.name,
                parentId: department.parent_department_id || null,
            }));
        }

        const projectTasks = (await this.taskQueryService.buildFullTaskList({ departmentId, projectId: id }, '')).info;
        const taskDone = projectTasks.filter((task: { status: TASK_STATUS }) => task.status === TASK_STATUS.DONE).length;
        const taskOnGoing = projectTasks.filter((task: { status: TASK_STATUS }) => task.status === TASK_STATUS.ONGOING)
            .length;
        const taskOnTest = projectTasks.filter((task: { status: TASK_STATUS }) => task.status === TASK_STATUS.ON_TEST)
            .length;
        const taskPending = projectTasks.filter((task: { status: TASK_STATUS }) => task.status === TASK_STATUS.PENDING)
            .length;

        // Calculate team information and time spent by each member
        const teamMap = new Map();

        // Process all tasks to extract team member information
        projectTasks.forEach((task: any) => {
            if (task.emp) {
                const empId = task.emp._id ? task.emp._id.toString() : task.emp.toString();

                if (teamMap.has(empId)) {
                    // Add time spent to existing team member
                    const existingMember = teamMap.get(empId);
                    existingMember.totalTimeSpent += task.totalTimeSpent || 0;
                    existingMember.taskCount += 1;

                    // Update task status counts
                    if (task.status === TASK_STATUS.DONE) existingMember.completedTasks += 1;
                    else if (task.status === TASK_STATUS.ONGOING) existingMember.ongoingTasks += 1;
                    else if (task.status === TASK_STATUS.ON_TEST) existingMember.testingTasks += 1;
                    else if (task.status === TASK_STATUS.PENDING) existingMember.pendingTasks += 1;
                } else {
                    // Create new team member entry
                    teamMap.set(empId, {
                        empInfo: task.emp,
                        totalTimeSpent: task.totalTimeSpent || 0,
                        taskCount: 1,
                        completedTasks: task.status === TASK_STATUS.DONE ? 1 : 0,
                        ongoingTasks: task.status === TASK_STATUS.ONGOING ? 1 : 0,
                        testingTasks: task.status === TASK_STATUS.ON_TEST ? 1 : 0,
                        pendingTasks: task.status === TASK_STATUS.PENDING ? 1 : 0,
                    });
                }
            }
        });

        // Convert team map to array and sort by total time spent (descending)
        const team = Array.from(teamMap.values()).sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);

        // Calculate team statistics
        const teamStats = {
            totalMembers: team.length,
            totalTeamTime: team.reduce((sum, member) => sum + member.totalTimeSpent, 0),
            averageTimePerMember: team.length > 0 ? team.reduce((sum, member) => sum + member.totalTimeSpent, 0) / team.length : 0,
            mostActiveMembers: team.slice(0, 3), // Top 3 members by time spent
        };

        return {
            id: project._id?.toString(),
            name: project.name,
            description: project.description,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            assignee: project.assignee,
            departments: project.departments,
            rate: project.rate,
            color: project.color,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            is_over_due: project.endDate < new Date(),
            projectTasks,
            taskDone,
            taskOnGoing,
            taskOnTest,
            taskPending,
            totalTime: projectTasks.reduce((sum, task: Task) => sum + task.totalTimeSpent, 0),
            team,
            teamStats,
        };
    }

    async getTaskDetailsProject(departmentId: string, projectId: string) {
        const tasks = await this.taskQueryService.getTaskProjectByDepartmentId(projectId, departmentId);
        return tasks;
    }

    async getDepartmentProject(departmentId: string, projectId: string) {
        const project = await this.projectModel.findById(new Types.ObjectId(projectId));
        const myDepartments = (await this.departmentService.getDepartmentTree(departmentId)).tree;
        const projectDepts = project?.departments;
        if (projectDepts) {
            const projectDeptsIds = projectDepts.map((deptId) => deptId.toString());
            const departmentMatch = myDepartments.filter((dept) => projectDeptsIds.includes(dept.id));
            return departmentMatch ? { tree: departmentMatch } : { tree: [] };
        }
        return { tree: [] };
    }
}