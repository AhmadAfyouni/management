import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import { RequiredPermissions } from 'src/common/decorators/role.decorator';
import { GetAccount } from 'src/common/decorators/user-guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

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
}
