import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationOptions } from '../interfaces/pagination.interface';

export const Pagination = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): PaginationOptions => {
        const request = ctx.switchToHttp().getRequest();

        const page = request.query.page ? parseInt(request.query.page, 10) : 1;
        const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
        const sort = request.query.sort || 'createdAt';
        const order = request.query.order === 'asc' ? 'asc' : 'desc';
        const search = request.query.search || '';

        return {
            page,
            limit,
            sort,
            order,
            search
        };
    },
);
