import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schema/comment.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { GetCommentDto } from './dto/get-comment.dto';

@Injectable()
export class CommentService {
    constructor(@InjectModel(Comment.name) private commentModel: Model<CommentDocument>) { }

    async createComment(createCommentDto: CreateCommentDto, userId: string): Promise<GetCommentDto> {
        try {
            const comment = new this.commentModel({
                content: createCommentDto.content,
                task: createCommentDto.taskId,
                emp: userId,
                fileUrl: createCommentDto.fileUrl,
            });
            const c = await (await comment.save()).populate("emp");
            return new GetCommentDto(c);
        } catch (error) {
            throw new InternalServerErrorException('Error creating comment', error.message);
        }
    }

    async getCommentsByTask(taskId: string): Promise<GetCommentDto[]> {
        try {
            const comments = await this.commentModel.find({ task: taskId })
                .sort({ createdAt: -1 }) // Sort by most recent first
                .lean()
                .populate('emp');
            return comments.map(comment => new GetCommentDto(comment));
        } catch (error) {
            throw new InternalServerErrorException('Error retrieving comments', error.message);
        }
    }

    async updateComment(commentId: string, updateCommentDto: UpdateCommentDto, userId: string): Promise<GetCommentDto> {
        try {
            // Validate the comment ID
            if (!Types.ObjectId.isValid(commentId)) {
                throw new NotFoundException('Invalid comment ID format');
            }

            // Find the comment
            const comment = await this.commentModel.findById(commentId);

            if (!comment) {
                throw new NotFoundException('Comment not found');
            }

            // Check if the user is the author of the comment
            if (comment.emp.toString() !== userId) {
                throw new ForbiddenException('You do not have permission to edit this comment');
            }

            // Update the comment
            comment.content = updateCommentDto.content;

            // Save the updated comment
            await comment.save();

            // Retrieve the updated comment with populated emp field
            const updatedComment = await this.commentModel.findById(commentId)
                .populate('emp')
                .lean();

            return new GetCommentDto(updatedComment);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Error updating comment', error.message);
        }
    }

    async deleteComment(commentId: string, userId: string): Promise<{ status: boolean, message: string }> {
        try {
            // Validate the comment ID
            if (!Types.ObjectId.isValid(commentId)) {
                throw new NotFoundException('Invalid comment ID format');
            }

            // Find the comment
            const comment = await this.commentModel.findById(commentId);

            if (!comment) {
                throw new NotFoundException('Comment not found');
            }

            // Check if the user is the author of the comment
            if (comment.emp.toString() !== userId) {
                throw new ForbiddenException('You do not have permission to delete this comment');
            }

            // Delete the comment
            await this.commentModel.findByIdAndDelete(commentId);

            return {
                status: true,
                message: 'Comment deleted successfully'
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Error deleting comment', error.message);
        }
    }
}
