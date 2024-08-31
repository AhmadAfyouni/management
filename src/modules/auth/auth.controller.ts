import { Controller, Body, UnauthorizedException, Post, Get, Query, BadRequestException } from '@nestjs/common';
import { CreateEmpDto } from '../emp/dto/create-emp.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(
            loginDto.email,
            loginDto.password,
        );
        if (!user) {
            throw new UnauthorizedException("email or password is invalid");
        }
        return this.authService.login(user);
    }
    @Post('register')
    async register(@Body() registerDto: CreateEmpDto) {
        return this.authService.register(registerDto);
    }
    @Post('refresh-token')
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }
}
