// Controllers
import { AuthenticationController } from './controllers/authentication.controller';

// Modules
import { JwtConfigModule } from '../../configurations/jwt/jwt-configuration.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CacheModule } from '@nestjs/cache-manager';

// Services
import { JwtConfigService } from '../../configurations/jwt/jwt-configuration.service';
import { AuthenticationService } from './services/authentication.service';

// Strategies
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { LocalStrategy } from '../../common/strategies/local.strategy';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // time to save the OTP
      max: 1000, // maximum 1000 data
    }),
    JwtConfigModule,
    MailModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [JwtConfigModule],
      useFactory: async (configService: JwtConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: {
          expiresIn: configService.jwtExp,
          issuer: configService.jwtIssuer,
        },
      }),
      inject: [JwtConfigService],
    }),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, LocalStrategy, JwtStrategy],
})
export class AuthenticationModule {}
