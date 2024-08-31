import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { GetJobTitlesDto } from './dto/get-job-titles.dro';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { JobTitles, JobTitlesDocument } from './schema/job-ttiles.schema';

@Injectable()
export class JobTitlesService {
  constructor(@InjectModel(JobTitles.name) private jobTitlesModel: Model<JobTitlesDocument>) { }

  async create(createJobTitleDto: CreateJobTitleDto): Promise<JobTitles> {
    const createdJobTitle = new this.jobTitlesModel(createJobTitleDto);
    return createdJobTitle.save();
  }

  async findAll(): Promise<GetJobTitlesDto[]> {
    const jobs = await this.jobTitlesModel.find().populate("department_id").exec();
    return jobs.map(job => new GetJobTitlesDto(job));
  }

  async findOne(id: string): Promise<GetJobTitlesDto> {
    const jobTitle = await this.jobTitlesModel.findById(id).populate("department_id").exec();
    if (!jobTitle) {
      throw new NotFoundException(`JobTitle with id ${id} not found`);
    }
    return new GetJobTitlesDto(jobTitle);
  }

  async update(id: string, updateJobTitleDto: UpdateJobTitleDto): Promise<JobTitles> {
    const updatedJobTitle = await this.jobTitlesModel.findByIdAndUpdate(id, updateJobTitleDto, { new: true }).exec();
    if (!updatedJobTitle) {
      throw new NotFoundException(`JobTitle with id ${id} not found`);
    }
    return updatedJobTitle;
  }

  async remove(id: string): Promise<JobTitles> {
    const deletedJobTitle = await this.jobTitlesModel.findByIdAndDelete(id).exec();
    if (!deletedJobTitle) {
      throw new NotFoundException(`JobTitle with id ${id} not found`);
    }
    return deletedJobTitle;
  }
}
