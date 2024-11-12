import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { Project, ProjectDocument } from './schema/project.schema';

@Injectable()
export class ProjectService {
    constructor(
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    ) { }

    async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
        try {
            const parsedStartDate = new Date(createProjectDto.startDate.replace(/-/g, '/'));
            const parsedEndDate = new Date(createProjectDto.endDate.replace(/-/g, '/'));

            if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
                throw new BadRequestException('Invalid date format for startDate or endDate');
            }

            const projectData = {
                ...createProjectDto,
                startDate: parsedStartDate,
                endDate: parsedEndDate,
            };

            const project = new this.projectModel(projectData);
            return await project.save();
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to create project');
        }
    }

    async getProjectsByDepartment(departmentId: string): Promise<Project[]> {
        return await this.projectModel.find({ departments: { $in: departmentId } }).populate('sections').exec();
    }

    async getProjectById(id: string): Promise<Project> {
        const project = await this.projectModel.findById(id).populate('sections').exec();
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }

    async updateProject(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
        try {
            const updateFields: any = {};

            if (updateProjectDto.departments) {
                updateFields.departments = updateProjectDto.departments.map(deptId => new Types.ObjectId(deptId));
            }

            if (updateProjectDto.members) {
                updateFields.members = updateProjectDto.members.map(memberId => new Types.ObjectId(memberId));
            }

            if (updateProjectDto.startDate) {
                const parsedStartDate = new Date(updateProjectDto.startDate.replace(/-/g, '/'));
                if (isNaN(parsedStartDate.getTime())) {
                    throw new BadRequestException('Invalid date format for startDate');
                }
                updateFields.startDate = parsedStartDate;
            }

            if (updateProjectDto.endDate) {
                const parsedEndDate = new Date(updateProjectDto.endDate.replace(/-/g, '/'));
                if (isNaN(parsedEndDate.getTime())) {
                    throw new BadRequestException('Invalid date format for endDate');
                }
                updateFields.endDate = parsedEndDate;
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



    async deleteProject(id: string): Promise<void> {
        const result = await this.projectModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
    }
}
