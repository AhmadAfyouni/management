import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "src/config/jwt-payload.interface";
import { UserRole } from "src/config/role.enum";
import { FileUploadConfig } from "src/modules/upload/interfaces/file-upload.interfaces";

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

        const isAdmin = (request.user as JwtPayload).role === UserRole.ADMIN;

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

export const FileFields = createParamDecorator(
    (config: Record<string, FileUploadConfig>, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const files = request.files || {};
        const validatedFiles: Record<string, any[]> = {};

        for (const [configKey, fieldConfig] of Object.entries(config)) {
            const fieldName = fieldConfig.fieldName;
            const fieldFiles = files[fieldName] || [];

            if (fieldConfig.maxCount && fieldFiles.length > fieldConfig.maxCount) {
                throw new Error(`Too many files uploaded for field ${fieldName}. Maximum allowed: ${fieldConfig.maxCount}`);
            }

            const validFiles = fieldFiles.filter(file => {
                if (fieldConfig.maxSize && file.size > fieldConfig.maxSize) {
                    console.warn(`File ${file.originalname} exceeds maximum size for field ${fieldName}`);
                    return false;
                }

                if (fieldConfig.allowedMimeTypes && !fieldConfig.allowedMimeTypes.includes(file.mimetype)) {
                    console.warn(`File ${file.originalname} has invalid mime type for field ${fieldName}`);
                    return false;
                }

                return true;
            });

            validatedFiles[fieldName] = validFiles;
        }

        return validatedFiles;
    },
);







