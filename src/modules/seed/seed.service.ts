import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Emp, EmpDocument } from '../emp/schemas/emp.schema';
import { Department, DepartmentDocument } from '../department/schema/department.schema';
import { JobTitles, JobTitlesDocument } from '../job-titles/schema/job-ttiles.schema';
import { JobCategory, JobCategoryDocument } from '../job-category/schemas/job-category.schema';
import { UserRole } from 'src/config/role.enum';
import * as bcrypt from 'bcryptjs';
import { DefaultPermissions } from 'src/config/default-permissions';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
    constructor(
        @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
        @InjectModel(JobTitles.name) private jobTitlesModel: Model<JobTitlesDocument>,
        @InjectModel(JobCategory.name) private jobCategoryModel: Model<JobCategoryDocument>,
    ) { }

    async onApplicationBootstrap() {
        await this.seedDatabase();
    }

    private async seedDatabase() {
        const adminEmail = 'admin@example.com';
        const existingAdmin = await this.empModel.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        const jobCategory = await this.jobCategoryModel.create({
            name: 'Management',
            description: 'Handles administrative tasks',
            required_education: 'Bachelor’s Degree',
            required_experience: '5 years',
            required_skills: ['Leadership', 'Organization', 'Decision Making'],
        });

        const department = await this.departmentModel.create({
            name: 'Admin Department',
            goal: 'Manage and oversee operations',
            category: 'Administration',
            mainTasks: 'Planning, Organizing, and Supervising',
        });

        const jobTitle = await this.jobTitlesModel.create({
            title: 'Administrator',
            description: 'Responsible for overall management',
            responsibilities: ['Manage operations', 'Supervise staff'],
            department_id: department._id.toString(),
            category: (jobCategory as any)._id.toString(),
            permissions: DefaultPermissions.admin,
            is_manager: true,
        });

        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        await this.empModel.create({
            changed_password: true,
            name: 'Admin User',
            national_id: '1234567890',
            dob: new Date('1980-01-01'),
            gender: 'Male',
            marital_status: 'Single',
            phone: '1234567890',
            email: adminEmail,
            address: 'Admin Address',
            employment_date: new Date(),
            job_id: jobTitle._id.toString(),
            department_id: department._id.toString(),
            base_salary: 50000,
            password: hashedPassword,
            role: UserRole.ADMIN,
        });

        console.log('Database seeded successfully!');
    }
}
