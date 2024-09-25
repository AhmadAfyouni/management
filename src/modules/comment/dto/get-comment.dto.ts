import { IsArray, IsOptional, IsString } from 'class-validator';
import { GetEmpDto } from 'src/modules/emp/dto/get-emp.dto';

export class GetCommentDto {
    id: string;
    content?: string;
    emp?: string;
    files?: string[];
    createdAt?: Date;
    updatedAt?: Date;

    constructor(comment: any) {
        this.id = comment._id.toString();
        this.content = comment.content;
        this.files = comment.files || [];
        this.createdAt = comment.createdAt;
        this.updatedAt = comment.updatedAt;
        if (comment.emp) {
            this.emp = comment.emp.name;
        }
    }
}
