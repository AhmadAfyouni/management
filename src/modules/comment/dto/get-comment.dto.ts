import { IsArray, IsOptional, IsString } from 'class-validator';
import { GetEmpDto } from 'src/modules/emp/dto/get-emp.dto';

export class GetCommentDto {
    id: string;
    content?: string;
    files?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    author: {
        name: string,
        id: string,
    };

    constructor(comment: any) {
        this.id = comment._id.toString();
        this.content = comment.content;
        this.files = comment.files || [];
        this.createdAt = comment.createdAt;
        this.updatedAt = comment.updatedAt;
        this.author = {
            name: '',
            id: ''
        };
        if (comment.emp) {
            this.author.name = comment.emp.name;
            this.author.id = comment.emp._id.toString();
        }
    }
}
