import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompanyProfile, CompanyProfileDocument } from './schemas/company-profile.schema';
import { CreateCompanyProfileDto } from './dto/create-company-profile.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Injectable()
export class CompanyProfileService {
  constructor(
    @InjectModel(CompanyProfile.name)
    private companyProfileModel: Model<CompanyProfileDocument>,
  ) {}

  async create(createCompanyProfileDto: CreateCompanyProfileDto): Promise<CompanyProfile> {
    try {
      // Check if a company profile already exists
      const existingProfile = await this.companyProfileModel.findOne();
      if (existingProfile) {
        throw new ConflictException('Company profile already exists. Only one company profile is allowed.');
      }

      const companyProfile = new this.companyProfileModel({
        ...createCompanyProfileDto,
        establishmentDate: new Date(createCompanyProfileDto.establishmentDate),
        isSetupCompleted: true,
      });

      return await companyProfile.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ConflictException(`${field} already exists.`);
      }
      throw error;
    }
  }

  async findOne(): Promise<CompanyProfile | null> {
    return await this.companyProfileModel.findOne().exec();
  }

  async update(updateCompanyProfileDto: UpdateCompanyProfileDto): Promise<CompanyProfile | null> {
    const existingProfile = await this.companyProfileModel.findOne();
    if (!existingProfile) {
      throw new NotFoundException('Company profile not found');
    }

    const updateData: any = { ...updateCompanyProfileDto };
    if (updateCompanyProfileDto.establishmentDate) {
      updateData.establishmentDate = new Date(updateCompanyProfileDto.establishmentDate);
    }

    const updatedProfile = await this.companyProfileModel
      .findByIdAndUpdate(existingProfile._id, updateData, { new: true })
      .exec();

    return updatedProfile;
  }

  async isSetupCompleted(): Promise<boolean> {
    const profile = await this.companyProfileModel.findOne().exec();
    return profile ? profile.isSetupCompleted : false;
  }

  async markSetupCompleted(): Promise<void> {
    const profile = await this.companyProfileModel.findOne();
    if (profile) {
      await this.companyProfileModel.findByIdAndUpdate(
        profile._id,
        { isSetupCompleted: true },
        { new: true }
      );
    }
  }

  async getBusinessTypes(): Promise<string[]> {
    // Return all available business types
    return [
      'Technology',
      'Healthcare',
      'Retail',
      'Manufacturing',
      'Education',
      'Finance',
      'Real Estate',
      'Logistics',
      'Hospitality',
      'Telecommunications',
      'Energy',
      'Consulting',
      'Marketing',
      'Transportation',
      'Pharmaceuticals',
      'Agriculture',
      'Entertainment',
      'Non-profit',
      'Government',
      'E-commerce'
    ];
  }

  async uploadLogo(logoUrl: string): Promise<CompanyProfile | null> {
    const profile = await this.companyProfileModel.findOne();
    if (!profile) {
      throw new NotFoundException('Company profile not found');
    }

    return await this.companyProfileModel
      .findByIdAndUpdate(profile._id, { companyLogo: logoUrl }, { new: true })
      .exec();
  }

  async addLicenseCertification(profileId: string, license: any): Promise<CompanyProfile | null> {
    return await this.companyProfileModel
      .findByIdAndUpdate(
        profileId,
        { $push: { licensesCertifications: license } },
        { new: true }
      )
      .exec();
  }

  async removeLicenseCertification(profileId: string, licenseId: string): Promise<CompanyProfile | null> {
    return await this.companyProfileModel
      .findByIdAndUpdate(
        profileId,
        { $pull: { licensesCertifications: { _id: licenseId } } },
        { new: true }
      )
      .exec();
  }
}
