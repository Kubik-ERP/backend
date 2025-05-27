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

// Services
import { JwtConfigService } from '../../configurations/jwt/jwt-configuration.service';
import { AuthenticationService } from './services/authentication.service';

// Strategies
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { LocalStrategy } from '../../common/strategies/local.strategy';
import { GoogleStrategy } from 'src/common/strategies/google.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    JwtConfigModule,
    MailModule,
    UsersModule,
    PassportModule,
    PrismaModule,
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
  providers: [
    AuthenticationService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
  ],
})
export class AuthenticationModule {}
