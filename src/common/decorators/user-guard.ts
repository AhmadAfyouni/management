import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "src/config/jwt-payload.interface";
import { UserRole } from "src/config/role.enum";

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

export const IsAdmin = createParamDecorator(
    async (
        data: unknown,
        context: ExecutionContext,
    ): Promise<boolean> => {
        const request = context.switchToHttp().getRequest();

        const isAdmin = (request.user as JwtPayload).role===UserRole.ADMIN;
        
        return isAdmin;
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







