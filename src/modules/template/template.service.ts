import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { UpdateTemplateDto } from './dtos/update-template.dto';
import { Template } from './schema/tamplate.schema';

@Injectable()
export class TemplateService {
    constructor(
        @InjectModel(Template.name)
        private readonly templateModel: Model<Template>,
    ) { }

    async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
        try {
            const createdTemplate = new this.templateModel(createTemplateDto);
            return await createdTemplate.save();
        } catch (error) {
            if (error.code === 11000) {
                throw new ConflictException('Template name must be unique');
            }
            throw error;
        }
    }

    async findAll(): Promise<Template[]> {
        return this.templateModel
            .find()
            // .populate('departments_schedule.department_id')
            .exec();
    }

    async findOne(id: string): Promise<Template> {
        const template = await this.templateModel
            .findById(id)
            // .populate('departments_schedule.department_id')
            .exec();

        if (!template) {
            throw new NotFoundException(`Template with ID ${id} not found`);
        }
        return template;
    }

    async findByType(type: string): Promise<Template[]> {
        return this.templateModel
            .find({ type })
            // .populate('departments_schedule.department_id')
            .exec();
    }

    async findByDepartmentId(departmentId: string): Promise<Template[]> {
        return this.templateModel
            .find({ 'departments_schedule.department_id': departmentId })
            // .populate('departments_schedule.department_id')
            .exec();
    }

    async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
        try {
            const updatedTemplate = await this.templateModel
                .findByIdAndUpdate(id, updateTemplateDto, { new: true })
                // .populate('departments_schedule.department_id')
                .exec();

            if (!updatedTemplate) {
                throw new NotFoundException(`Template with ID ${id} not found`);
            }
            return updatedTemplate;
        } catch (error) {
            if (error.code === 11000) {
                throw new ConflictException('Template name must be unique');
            }
            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        const result = await this.templateModel.deleteOne({ _id: id }).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException(`Template with ID ${id} not found`);
        }
    }
}
