import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DefaultPermissions } from 'src/config/default-permissions';
import { UserRole } from 'src/config/role.enum';
import { EmpService } from '../emp/emp.service';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { GetJobTitlesDto } from './dto/get-job-titles.dro';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { JobTitles, JobTitlesDocument } from './schema/job-ttiles.schema';

@Injectable()
export class JobTitlesService {
  constructor(
    @InjectModel(JobTitles.name) private readonly jobTitlesModel: Model<JobTitlesDocument>,
    @Inject(forwardRef(() => EmpService)) private readonly empService: EmpService,
  ) { }

  async create(createJobTitleDto: CreateJobTitleDto): Promise<{ message: string; jobTitle: JobTitles }> {
    try {
      if (!createJobTitleDto.permissions || createJobTitleDto.permissions.length === 0) {
        const permissions = createJobTitleDto.is_manager
          ? DefaultPermissions[UserRole.PRIMARY_USER]
          : DefaultPermissions[UserRole.SECONDARY_USER];

        createJobTitleDto.permissions = permissions;
      }


      const existingManager = await this.jobTitlesModel
        .findOne({ department_id: createJobTitleDto.department_id, is_manager: true })
        .lean()
        .exec();

      if (existingManager && createJobTitleDto.is_manager) {
        throw new BadRequestException('A manager already exists for this department.');
      }

      const createdJobTitle = new this.jobTitlesModel(createJobTitleDto);
      const savedJobTitle = await createdJobTitle.save();

      return {
        message: 'Job title created successfully',
        jobTitle: savedJobTitle,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create job title', error.message);
    }
  }

  async findAll(): Promise<any[]> {
    try {
      const jobs = await this.jobTitlesModel
        .find({})
        .populate('department_id permissions category')
        .lean()
        .exec();
      const jobsDto = jobs.map(job => new GetJobTitlesDto(job));
      return jobsDto;
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve job titles', error.message);
    }
  }

  async findAccessJobTitles(departmentIds: string[]): Promise<GetJobTitlesDto[]> {
    try {
      const jobs = await this.jobTitlesModel
        .find({ department_id: { $in: departmentIds } })
        .populate('department_id permissions category')
        .lean()
        .exec();
      const jobsDto = jobs.map(job => new GetJobTitlesDto(job));
      return jobsDto;
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve job titles', error.message);
    }
  }

  async findOne(id: string): Promise<GetJobTitlesDto> {
    try {
      const jobTitle = await this.jobTitlesModel
        .findById(new Types.ObjectId(id))
        .populate('department_id permissions category')
        .exec();
      if (!jobTitle) {
        throw new NotFoundException(`Job title with id ${id} not found`);
      }
      return new GetJobTitlesDto(jobTitle);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to retrieve job title with id ${id}`, error.message);
    }
  }


  async update(id: string, updateJobTitleDto: UpdateJobTitleDto): Promise<{ message: string; jobTitle: JobTitles }> {
    try {

      if (!updateJobTitleDto.permissions || updateJobTitleDto.permissions.length === 0) {
        const permissions = updateJobTitleDto.is_manager
          ? DefaultPermissions[UserRole.PRIMARY_USER]
          : DefaultPermissions[UserRole.SECONDARY_USER];

        updateJobTitleDto.permissions = permissions;
      }

      const updatedJobTitle = await this.jobTitlesModel.findByIdAndUpdate(
        id,
        updateJobTitleDto,
        { new: true, runValidators: true }
      ).populate('department_id permissions category').exec();

      if (updateJobTitleDto.is_manager) {
        const emps = await this.empService.getEmpByJobTitle(id);
        emps?.forEach(emp => {
          this.empService.updateEmp(emp._id.toString(), {
            role: UserRole.PRIMARY_USER
          });
        });
      }
      if (!updatedJobTitle) {
        throw new NotFoundException(`Job title with id ${id} not found`);
      }
      return {
        message: 'Job title updated successfully',
        jobTitle: updatedJobTitle,
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update job title with id ${id}`, error.message);
    }
  }

  async remove(id: string): Promise<JobTitles> {
    try {
      const deletedJobTitle = await this.jobTitlesModel.findByIdAndDelete(id).exec();
      if (!deletedJobTitle) {
        throw new NotFoundException(`Job title with id ${id} not found`);
      }
      return deletedJobTitle;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete job title with id ${id}`, error.message);
    }
  }

  async findByDepartmentId(id: string): Promise<JobTitlesDocument | null> {
    const jobTitle = await this.jobTitlesModel.findOne({ department_id: id, is_manager: true }).lean().exec();
    return jobTitle;
  }


}
