import { Controller, Post, Body, Get, Param, UseGuards, Put, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { GetAccount } from 'src/common/decorators/user-guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('comment')
export class CommentController {
    constructor(private readonly commentService: CommentService) { }

    @Post()
    async createComment(@Body() createCommentDto: CreateCommentDto, @GetAccount() userId) {
        return this.commentService.createComment(createCommentDto, userId);
    }

    @Get(':taskId')
    async getCommentsByTask(@Param('taskId') taskId: string) {
        return this.commentService.getCommentsByTask(taskId);
    }

    @Put(':commentId')
    async updateComment(
        @Param('commentId') commentId: string,
        @Body() updateCommentDto: UpdateCommentDto,
        @GetAccount() userId
    ) {
        return this.commentService.updateComment(commentId, updateCommentDto, userId);
    }

    @Delete(':commentId')
    @HttpCode(HttpStatus.OK)
    async deleteComment(
        @Param('commentId') commentId: string,
        @GetAccount() userId
    ) {
        return this.commentService.deleteComment(commentId, userId);
    }
}