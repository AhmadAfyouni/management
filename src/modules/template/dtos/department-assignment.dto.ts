import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class DepartmentAssignmentDto {
  @IsMongoId({ message: 'department must be a valid Mongo ID' })
  @IsNotEmpty({ message: 'department is required' })
  department: string;

  @IsOptional()
  @IsMongoId({ message: 'employee must be a valid Mongo ID' })
  employee?: string;
}
