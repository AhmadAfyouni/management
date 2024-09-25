import { IsString, IsMongoId, IsDateString, IsArray } from 'class-validator';

export class GetInternalCommunicationDto {
  @IsMongoId()
  _id: string;

  @IsMongoId()
  emp: string;

  @IsString()
  department: string;

  @IsString()
  message_body: string;

  @IsDateString()
  date: Date;

  @IsArray()
  files: string[];

  constructor(communication: any) {
    this._id = communication._id.toString();
    this.emp = communication.emp_id.name; 
    this.department = communication.department_id.name; 
    this.message_body = communication.message_body;
    this.date = communication.createdAt;
    this.files = communication.files || [];
  }
}
