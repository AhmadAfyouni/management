import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt/dist";
import { PassportModule } from "@nestjs/passport";
import { EmpModule } from "../emp/emp.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import "dotenv/config"
import { JwtStrategy } from "../../common/utils/jwt.strategy";
@Module({
    imports: [
        EmpModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '20d' },
        }),
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
})
export class AuthModule { }