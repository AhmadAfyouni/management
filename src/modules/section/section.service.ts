import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../task/schema/task.schema';
import { TaskValidationService } from '../task/task-validation.service';
import { CreateSectionDto } from './dtos/create-section.dto';
import { UpdateSectionDto } from './dtos/update-section.dto';
import { Section, SectionDocument } from './schemas/section.schema';

@Injectable()
export class SectionService {
    constructor(
        @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    ) { }

    async createSection(createSectionDto: CreateSectionDto): Promise<Section> {
        const section = new this.sectionModel(createSectionDto);
        return section.save();
    }

    async createInitialSections(empId: string, assignee: string): Promise<Section[]> {
        const sectionsToCreate = ['Recently Assigned'];
        let section: Section[] = [];
        for (const name of sectionsToCreate) {
            const existingSection = await this.sectionModel.findOne({
                name,
                emp: empId,
                type: 'default'
            });

            if (!existingSection) {
                const sectionForMe = await this.createSection({ name, emp: empId, type: 'default', type_section: 'FOR_ME' });
                section.push(sectionForMe);
            } else {
                section.push(existingSection);
            }
        }
        const sectionByMe = await this.createInitialSectionsByMe(empId, assignee);
        section.push(sectionByMe);
        return section;
    }


    async createInitialSectionsByMe(empId: string, assignee: string): Promise<Section> {
        const sectionsToCreate = ['Recently Assigned'];
        let section;
        for (const name of sectionsToCreate) {
            const existingSection = await this.sectionModel.findOne({
                name,
                emp: assignee,
                type: 'default',
                type_section: 'BY_ME',
            });

            if (!existingSection) {
                section = await this.createSection({ name, emp: assignee, type: 'default', type_section: 'BY_ME' });
            } else {
                section = existingSection;
            }
        }

        return section;
    }




    async getSectionsByEmployee(empId: string): Promise<Section[]> {
        return await this.sectionModel.find({ emp: empId }).exec();
    }



    async updateSection(id: string, updateSectionDto: UpdateSectionDto): Promise<Section> {
        const updatedSection = await this.sectionModel.findByIdAndUpdate(id, updateSectionDto, { new: true }).exec();
        if (!updatedSection) {
            throw new NotFoundException(`Section with ID ${id} not found`);
        }
        return updatedSection;
    }

    async deleteSection(id: string, empId: string): Promise<void> {
        // First check if the section exists
        const sectionToDelete = await this.sectionModel.findById(id).exec();
        if (!sectionToDelete) {
            throw new NotFoundException(`Section with ID ${id} not found`);
        }
        if (sectionToDelete.type == "default") {
            throw new NotFoundException(
                `Cannot delete default section ${sectionToDelete.name}`,
            );
        }

        // Get or create a default section to move tasks to
        const defaultSection = await this.createInitialSections(empId, empId);

        // Find all tasks in the section to be deleted
        const tasks = await this.taskModel.find({ section_id: id });

        // Update all tasks to point to the default section
        if (tasks.length > 0) {
            await this.taskModel.updateMany(
                { section_id: id },
                { section_id: defaultSection }
            );
        }

        // Now delete the section
        await this.sectionModel.findByIdAndDelete(id).exec();
    }
}