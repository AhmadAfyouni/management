import { IsString, IsMongoId, IsDateString, IsArray } from 'class-validator';

export class GetInternalCommunicationDto {
  @IsMongoId()
  _id: string;

  @IsMongoId()
  emp: string;

  sender_id:string;
  @IsString()
  department: string;

  @IsString()
  message: string;

  @IsDateString()
  date: Date;

  @IsArray()
  files: string[];

  constructor(communication: any) {    
    this._id = communication._id.toString();
    this.emp = communication.emp_id.name; 
    this.sender_id = communication.emp_id._id.toString(); 
    this.department = communication.department_id.name; 
    this.message = communication.message;
    this.date = communication.createdAt;
    this.files = communication.files || [];
  }
}
