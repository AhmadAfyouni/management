import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schema/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { GetCommentDto } from './dto/get-comment.dto';

@Injectable()
export class CommentService {
    constructor(@InjectModel(Comment.name) private commentModel: Model<CommentDocument>) {}

    async createComment(createCommentDto: CreateCommentDto, userId: string): Promise<GetCommentDto> {
        try {
            const comment = new this.commentModel({
                content: createCommentDto.content,
                task: createCommentDto.taskId,
                emp: userId,
                files: createCommentDto.files || [],
            });
            const c=await (await comment.save()).populate("emp");            
            return new GetCommentDto(c);
        } catch (error) {
            throw new InternalServerErrorException('Error creating comment', error.message);
        }
    }

    async getCommentsByTask(taskId: string): Promise<GetCommentDto[]> {
        try {
            const comments = await this.commentModel.find({ task: taskId }).lean().populate('emp');            
            return comments.map(comment => new GetCommentDto(comment));
        } catch (error) {
            throw new InternalServerErrorException('Error retrieving comments', error.message);
        }
    }
}
