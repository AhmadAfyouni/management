import { Controller, Body, UnauthorizedException, Post, Get, BadRequestException } from '@nestjs/common';
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
            throw new UnauthorizedException("Email or password is invalid");
        }
        if (!user._doc.changed_password) {            
            throw new BadRequestException({
                message: `You must change your password on the first login,${user._doc._id}`,
            });
        }
        return this.authService.login(user);
    }

    @Post('refresh-token')
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }

}
