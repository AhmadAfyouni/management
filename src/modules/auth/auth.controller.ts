import { Controller, Body, UnauthorizedException, Post, BadRequestException, Param } from '@nestjs/common';
import { UpdatePasswordDto } from '../emp/dto/update-password.dto';
import { EmpService } from '../emp/emp.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService,
        private readonly empService: EmpService,
    ) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(
            loginDto.email,
            loginDto.password,
        );
        if (!user) {
            throw new UnauthorizedException("Email or password is invalid");
        }
        if (!user.changed_password) {
            throw new BadRequestException({
                message: `You must change your password on the first login,${user._id}`,
            });
        }
        return this.authService.login(user);
    }

    @Post('refresh-token')
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }

    @Post('change-password/:empId')
    async changePassword(
        @Param('empId') empId: string,
        @Body() updatePasswordDto: UpdatePasswordDto,
    ): Promise<{ message: string; }> {
        await this.empService.updatePassword(empId, updatePasswordDto);
        return { message: 'Password updated successfully' };
    }

}
