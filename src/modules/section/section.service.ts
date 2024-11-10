// section.service.ts
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

    async getSectionsByProject(projectId: string): Promise<Section[]> {
        return this.sectionModel.find({ project: projectId }).populate('tasks').exec();
    }

    async getSectionById(id: string): Promise<Section> {
        const section = await this.sectionModel.findById(id).populate('tasks').exec();
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
