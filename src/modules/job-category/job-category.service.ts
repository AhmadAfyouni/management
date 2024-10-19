import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateJobCategoryDto } from './dtos/create-category.dto';
import { GetJobCategoryDto } from './dtos/get-category.dto';
import { JobCategory, JobCategoryDocument } from './schemas/job-category.schema';

@Injectable()
export class JobCategoryService {
    constructor(
        @InjectModel(JobCategory.name) private jobCategoryModel: Model<JobCategoryDocument>,
    ) { }

    async create(createJobCategoryDto: CreateJobCategoryDto): Promise<JobCategory> {
        try {
            const createdCategory = new this.jobCategoryModel(createJobCategoryDto);
            return await createdCategory.save();
        } catch (error) {
            throw new InternalServerErrorException('Failed to create job category', error.message);
        }
    }

    async findAll(): Promise<GetJobCategoryDto[]> {
        try {
            const categories = await this.jobCategoryModel.find().lean().exec();
            return categories.map(category => new GetJobCategoryDto(category));
        } catch (error) {
            throw new InternalServerErrorException('Failed to retrieve job categories', error.message);
        }
    }

    async findOne(id: string): Promise<GetJobCategoryDto> {
        try {
            const category = await this.jobCategoryModel.findById(id).lean().exec();
            if (!category) {
                throw new NotFoundException(`Job category with ID ${id} not found`);
            }
            return new GetJobCategoryDto(category);
        } catch (error) {
            throw new InternalServerErrorException(`Failed to retrieve job category with ID ${id}`, error.message);
        }
    }

    async delete(id: string): Promise<GetJobCategoryDto> {
        try {
            const deletedCategory = await this.jobCategoryModel.findByIdAndDelete(id).lean().exec();
            if (!deletedCategory) {
                throw new NotFoundException(`Job category with ID ${id} not found`);
            }
            return new GetJobCategoryDto(deletedCategory);
        } catch (error) {
            throw new InternalServerErrorException(`Failed to delete job category with ID ${id}`, error.message);
        }
    }

    async findUniqueEducationAndExperience(): Promise<{ requiredEducation: string[], requiredExperience: string[] }> {
        try {
          const requiredEducation = await this.jobCategoryModel.distinct('required_education').exec();
          const requiredExperience = await this.jobCategoryModel.distinct('required_experience').exec();
          
          return {
            requiredEducation,
            requiredExperience,
          };
        } catch (error) {
          throw new InternalServerErrorException('Failed to retrieve unique education and experience levels', error.message);
        }
      }
    
}
