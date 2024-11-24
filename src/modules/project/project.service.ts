import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { forwardRef } from '@nestjs/common/utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parseObject } from 'src/helper/parse-object';
import { DepartmentService } from '../department/depratment.service';
import { EmpService } from '../emp/emp.service';
import { TASK_STATUS } from '../task/enums/task-status.enum';
import { TasksService } from '../task/task.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { ProjectStatus } from './enums/project-status';
import { Project, ProjectDocument } from './schema/project.schema';

@Injectable()
export class ProjectService {
    constructor(
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        private readonly empService: EmpService,
        @Inject(forwardRef(() => TasksService))
        private readonly taskService: TasksService,
        private readonly departmentService: DepartmentService
    ) { }


    async getContributorsProject(projectId: string) {
        const project = await this.projectModel.findById(parseObject(projectId)).populate("members  departments").lean().exec();
        const deparmentsId = project?.departments;
        let mangers;
        if (deparmentsId) {
            mangers = deparmentsId.map(async (department) => await this.empService.findManagerByDepartment(department.toString()));
        }
        return { mangers }
    }

    async getAllProject() {
        return await this.projectModel.find().populate('members  departments').exec();
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
        return await this.projectModel.find({ departments: { $in: departmentId } }).populate('members  departments').exec();
    }

    async getProjectById(id: string): Promise<Project> {
        const project = await this.projectModel.findById(parseObject(id)).populate('members  departments').exec();
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }

    async getEmpProject(empId: string) {
        return await this.projectModel.find({ members: { $in: empId } }).populate('members  departments').lean().exec();
    }

    async getManagerProject(departmentId: string) {
        return await this.projectModel.find({ departments: { $in: departmentId } }).populate('members  departments').lean().exec();
    }

    async updateProject(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
        try {
            const updateFields: any = {};
            if (updateProjectDto.status === ProjectStatus.COMPLETED) {
                const tasks = await this.taskService.getProjectTaskDetails(id);
                const completedTasks = tasks.filter(task => task.status === TASK_STATUS.DONE);
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
                const newDepartments = updateProjectDto.departments.map(deptId => deptId.toString());
                const mergedDepartments = Array.from(new Set([...existingDepartments, ...newDepartments]));

            }

            const updatedProject = await this.projectModel.findByIdAndUpdate(
                id,
                { $set: { ...updateProjectDto, ...updateFields } },
                { new: true }
            ).exec();

            if (!updatedProject) {
                throw new NotFoundException(`Project with ID ${id} not found`);
            }

            return updatedProject;
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to update project');
        }
    }


    async canCompleteProject(id: string): Promise<boolean> {
        const project = await this.projectModel.findById(new Types.ObjectId(id)).exec();
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        const tasks = await this.taskService.getProjectTaskDetails(id);
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
        const projectTasks = await (await this.taskService.getProjectTasks(id, departmentId)).data;
        const taskDone = projectTasks.filter((task) => task.status === TASK_STATUS.DONE).length;
        const taskOnGoing = projectTasks.filter((task) => task.status === TASK_STATUS.ONGOING).length;
        const taskOnTest = projectTasks.filter((task) => task.status === TASK_STATUS.ON_TEST).length;
        const taskPending = projectTasks.filter((task) => task.status === TASK_STATUS.PENDING).length;
        return { ...project, is_over_due: project.endDate < new Date(), projectTasks, taskDone, taskOnGoing, taskOnTest, taskPending };
    }

    async getTaskDetailsProject(departmentId: string, projectId: string) {
        const tasks = await this.taskService.getTaskProjectByDepartmentId(departmentId, projectId);
        return tasks;
    }

    async getDepartmentProject(departmentId: string, projectId: string) {
        const project = await this.projectModel.findById(new Types.ObjectId(projectId));
        const myDepartments = (await this.departmentService.getDepartmentTree(departmentId)).tree;
        const projectDepts = project?.departments;
        if (projectDepts) {
            const projectDeptsIds = projectDepts.map((deptId) => deptId.toString());
            const departmentMatch = myDepartments.filter((dept) => projectDeptsIds.includes(dept.id));
            return departmentMatch ? departmentMatch : [];
        }
        return [];
    }
}
