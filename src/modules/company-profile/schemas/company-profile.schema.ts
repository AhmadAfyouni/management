import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyProfileDocument = CompanyProfile & Document;

export enum BusinessType {
  TECHNOLOGY = 'Technology',
  HEALTHCARE = 'Healthcare', 
  RETAIL = 'Retail',
  MANUFACTURING = 'Manufacturing',
  EDUCATION = 'Education',
  FINANCE = 'Finance',
  REAL_ESTATE = 'Real Estate',
  LOGISTICS = 'Logistics',
  HOSPITALITY = 'Hospitality',
  TELECOMMUNICATIONS = 'Telecommunications',
  ENERGY = 'Energy',
  CONSULTING = 'Consulting',
  MARKETING = 'Marketing',
  TRANSPORTATION = 'Transportation',
  PHARMACEUTICALS = 'Pharmaceuticals',
  AGRICULTURE = 'Agriculture',
  ENTERTAINMENT = 'Entertainment',
  NON_PROFIT = 'Non-profit',
  GOVERNMENT = 'Government',
  E_COMMERCE = 'E-commerce'
}

@Schema()
export class SocialMediaLinks {
  @Prop()
  facebook?: string;

  @Prop()
  twitter?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  instagram?: string;

  @Prop()
  website?: string;
}

@Schema()
export class LicensesCertifications {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  number: string;

  @Prop()
  issuingAuthority?: string;

  @Prop()
  issueDate?: Date;

  @Prop()
  expiryDate?: Date;

  @Prop()
  documentUrl?: string;
}

@Schema({
  timestamps: true,
  collection: 'company_profiles'
})
export class CompanyProfile {
  // Basic Information
  @Prop({ required: true, unique: true })
  companyName: string;

  @Prop()
  companyLogo?: string;

  @Prop({ required: true, unique: true })
  commercialRegistrationNumber: string;

  @Prop({ required: true })
  establishmentDate: Date;

  @Prop({ required: true, enum: BusinessType })
  businessType: BusinessType;

  @Prop({ required: true })
  companyDescription: string;

  // Contact and Location
  @Prop({ required: true, unique: true })
  officialEmail: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  companyAddress: string;

  @Prop()
  locationMapUrl?: string;

  @Prop({ type: SocialMediaLinks })
  socialMediaLinks?: SocialMediaLinks;

  // Legal and Financial Information
  @Prop({ required: true, unique: true })
  taxNumber: string;

  @Prop({ type: [LicensesCertifications], default: [] })
  licensesCertifications: LicensesCertifications[];

  @Prop({ type: [String], default: [] })
  termsAndConditionsFiles: string[];

  // Administrative Structure
  @Prop({ required: true })
  ceoName: string;

  @Prop()
  organizationalStructureFile?: string;

  // System Settings
  @Prop({ default: false })
  isSetupCompleted: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const CompanyProfileSchema = SchemaFactory.createForClass(CompanyProfile);
