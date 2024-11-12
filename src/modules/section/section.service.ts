import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSectionDto } from './dtos/create-section.dto';
import { UpdateSectionDto } from './dtos/update-section.dto';
import { Section, SectionDocument } from './schemas/section.schema';

@Injectable()
export class SectionService {
    constructor(
        @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
    ) { }

    async createSection(createSectionDto: CreateSectionDto): Promise<Section> {
        const section = new this.sectionModel(createSectionDto);
        return section.save();
    }


    async createInitialSections(departmentId?: string, projectId?: string): Promise<Section[]> {
        const sectionsToCreate = ['Pending', 'Ongoing', 'On Test'];
        const createdSections: Section[] = [];

        for (const name of sectionsToCreate) {
            const existingSection = await this.sectionModel.findOne({
                name,
                department: departmentId ?? null,
                project: projectId ?? null
            });

            if (!existingSection) {
                const section = await this.createSection({ name, department: departmentId, project: projectId });
                createdSections.push(section);
            } else {
                createdSections.push(existingSection);
            }
        }

        return createdSections;
    }

    async getPendingSectionId(departmentId?: string, projectId?: string): Promise<string> {
        const query = {
            name: 'Pending',
            department: departmentId ?? null,
            project: projectId ?? null
        };

        const pendingSection = await this.sectionModel.findOne(query).exec();

        if (!pendingSection) {
            throw new NotFoundException(`Pending section not found for the specified project or department`);
        }

        return pendingSection._id.toString();
    }

    async getSectionsByProject(projectId: string): Promise<Section[]> {
        return this.sectionModel.find({ project: projectId }).exec();
    }

    async getSectionsByDepartment(departmentId: string): Promise<Section[]> {
        return this.sectionModel.find({ department: departmentId }).exec();
    }

    async getSectionById(id: string): Promise<Section> {
        const section = await this.sectionModel.findById(id).exec();
        if (!section) {
            throw new NotFoundException(`Section with ID ${id} not found`);
        }
        return section;
    }

    async updateSection(id: string, updateSectionDto: UpdateSectionDto): Promise<Section> {
        const updatedSection = await this.sectionModel.findByIdAndUpdate(id, updateSectionDto, { new: true }).exec();
        if (!updatedSection) {
            throw new NotFoundException(`Section with ID ${id} not found`);
        }
        return updatedSection;
    }

    async deleteSection(id: string): Promise<void> {
        const result = await this.sectionModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Section with ID ${id} not found`);
        }
    }
}
