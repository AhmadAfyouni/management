import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department } from '../department/schema/department.schema';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { UpdateTemplateDto } from './dtos/update-template.dto';
import { Template } from './schema/tamplate.schema';

@Injectable()
export class TemplateService {
    constructor(
        @InjectModel(Template.name)
        private readonly templateModel: Model<Template>,
    ) { }

    populateTemplate() {
        return [
            {
                path: "departments_approval_track",
                model: Department.name,
                select: "name",
            },
            {
                path: "departments_execution_ids",
                model: Department.name,
                select: "name",
            }
        ];
    }
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
            .populate(this.populateTemplate())
            .exec();
    }

    async findOne(id: string): Promise<Template> {
        const template = await this.templateModel
            .findById(id)
            .populate(this.populateTemplate())
            .exec();

        if (!template) {
            throw new NotFoundException(`Template with ID ${id} not found`);
        }
        return template;
    }

    async findByType(type: string): Promise<Template[]> {
        return this.templateModel
            .find({ type })
            .populate(this.populateTemplate())
            .exec();
    }

    async findByDepartmentId(departmentId: string): Promise<Template[]> {
        return this.templateModel
            .find({ 'departments_schedule.department_id': departmentId })
            .populate(this.populateTemplate())
            .exec();
    }

    async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
        try {
            const updatedTemplate = await this.templateModel
                .findByIdAndUpdate(id, updateTemplateDto, { new: true })
                .populate(this.populateTemplate())
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
