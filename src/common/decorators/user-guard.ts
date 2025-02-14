import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "src/config/jwt-payload.interface";

export const GetAccessDepartment = createParamDecorator(
    async (
        data: unknown,
        context: ExecutionContext,
    ): Promise<string[]> => {
        const request = context.switchToHttp().getRequest();

        const account = (request.user as JwtPayload).accessibleDepartments;

        return account;
    },
);

export const GetAccessEmp = createParamDecorator(
    async (
        data: unknown,
        context: ExecutionContext,
    ): Promise<string[]> => {
        const request = context.switchToHttp().getRequest();

        const account = (request.user as JwtPayload).accessibleEmps;

        return account;
    },
);



export const GetAccessJobTitle = createParamDecorator(
    async (
        data: unknown,
        context: ExecutionContext,
    ): Promise<string[]> => {
        const request = context.switchToHttp().getRequest();

        const account = (request.user as JwtPayload).accessibleJobTitles;

        return account;
    },
);

export const GetDepartment = createParamDecorator(
    async (
        data: unknown,
        context: ExecutionContext,
    ): Promise<string> => {
        const request = context.switchToHttp().getRequest();

        const account = (request.user as JwtPayload).department;
        
        return account;
    },
);



export const GetAccount = createParamDecorator(
    async (
        data: unknown,
        context: ExecutionContext,
    ): Promise<string> => {
        const request = context.switchToHttp().getRequest();

        const account = request.user.userId;

        return account;
    },
);







