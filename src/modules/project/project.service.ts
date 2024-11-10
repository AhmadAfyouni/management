// project.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { Project, ProjectDocument } from './schema/project.schema';

@Injectable()
export class ProjectService {
    constructor(
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    ) {}

    async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
        const project = new this.projectModel(createProjectDto);
        return project.save();
    }

    async getProjectsByDepartment(departmentId: string): Promise<Project[]> {
        return this.projectModel.find({ departments: departmentId }).populate('sections').exec();
    }

    async getProjectById(id: string): Promise<Project> {
        const project = await this.projectModel.findById(id).populate('sections').exec();
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }

    async updateProject(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
        const updatedProject = await this.projectModel.findByIdAndUpdate(id, updateProjectDto, { new: true }).exec();
        if (!updatedProject) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return updatedProject;
    }

    async deleteProject(id: string): Promise<void> {
        const result = await this.projectModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
    }
}
