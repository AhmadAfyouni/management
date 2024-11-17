import { Injectable } from "@nestjs/common/decorators/core";
import { JwtService } from "@nestjs/jwt";
import { EmpService } from "../emp/emp.service";
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../../config/jwt-payload.interface';
import { ConflictException, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { CreateEmpDto } from "../emp/dto/create-emp.dto";
import "dotenv/config"
import { GetEmpDto } from "../emp/dto/get-emp.dto";
import { EmpDocument } from "../emp/schemas/emp.schema";

@Injectable()
export class AuthService {
    constructor(
        private readonly empService: EmpService,
        private readonly jwtService: JwtService,
    ) { }
    async validateUser(email: string, pass: string): Promise<EmpDocument | null> {
        try {
            const user = await this.empService.findByEmail(email);
            if (user && (await bcrypt.compare(pass, user.password))) {
                return user;
            }
            return null;
        } catch (error) {
            throw new UnauthorizedException('Validation failed');
        }
    }

    async login(user: EmpDocument) {
        try {
            const payload: JwtPayload = {
                email: user.email,
                sub: user._id.toString(),
                role: user.role,
                department: (user.job_id as any).department_id,
                permissions: (user.job_id as any).permissions,
                accessibleDepartments: (user.job_id as any).accessibleDepartments || [],
                accessibleEmps: (user.job_id as any).accessibleEmps || [],
                accessibleJobTitles: (user.job_id as any).accessibleJobTitles || [],
            };
            return {
                status: true,
                message: 'Login successful',
                role: payload.role,
                access_token: this.jwtService.sign(payload),
                refresh_token: this.generateRefreshToken(payload),
                user: new GetEmpDto(user),
            };
        } catch (error) {
            throw new UnauthorizedException('Login failed ' + error.message);
        }
    }

    generateRefreshToken(payload: JwtPayload) {
        return this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });
    }

    async refreshToken(token: string) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            const user = await this.empService.findById(payload.sub);
            if (!user) {
                throw new UnauthorizedException();
            }
            return this.login(user);
        } catch (error) {
            throw new UnauthorizedException(' ');
        }
    }

    async register(registerDto: CreateEmpDto) {
        try {
            await this.empService.createEmp(registerDto);
            return { status: true, message: 'created successfully' };
        } catch (e) {
            if (e.code === 11000) {
                const duplicateField = Object.keys(e.keyValue)[0];
                throw new ConflictException(`${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists.`);
            } else {
                throw new InternalServerErrorException('An unexpected error occurred during registration.' + e.message);
            }
        }
    }
}