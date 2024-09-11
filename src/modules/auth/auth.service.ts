import { Injectable } from "@nestjs/common/decorators/core";
import { JwtService } from "@nestjs/jwt";
import { EmpService } from "../emp/emp.service";
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../../config/jwt-payload.interface';
import { ConflictException, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "../../config/role.enum";
import { CreateEmpDto } from "../emp/dto/create-emp.dto";
import "dotenv/config"

@Injectable()
export class AuthService {
    constructor(
        private readonly empService: EmpService,
        private readonly jwtService: JwtService,
    ) { }
    async validateUser(email: string, pass: string): Promise<any> {
        try {
            const user = await this.empService.findByEmail(email);
            if (user && (await bcrypt.compare(pass, user.password))) {
                const { password, ...result } = user;
                return result;
            }
            return null;
        } catch (error) {
            throw new UnauthorizedException('Validation failed');
        }
    }

    async login(user: any) {
        try {            
            const payload: JwtPayload = { email: user._doc.email, sub: user._doc._id, role: UserRole.User };
            return {
                status: true,
                message: 'Login successful',
                access_token: this.jwtService.sign(payload),
                refresh_token: this.generateRefreshToken(payload),
            };
        } catch (error) {
            throw new UnauthorizedException('Login failed'+error.message);
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
            throw new UnauthorizedException('Invalid refresh token');
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
                throw new InternalServerErrorException('An unexpected error occurred during registration.'+e.message);
            }
        }

    }

}