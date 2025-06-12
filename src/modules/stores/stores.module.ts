import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtConfigModule } from 'src/configurations/jwt/jwt-configuration.module';
import { JwtConfigService } from 'src/configurations/jwt/jwt-configuration.service';
import { StoresController } from './controllers/stores.controller';
import { StoresService } from './services/stores.service';
import { LocalStrategy } from 'src/common/strategies/local.strategy';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // time to save the OTP
      max: 1000, // maximum 1000 data
    }),
    JwtConfigModule,
    PrismaModule,
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
    StorageServiceModule,
  ],
  controllers: [StoresController],
  providers: [StoresService, JwtStrategy],
})
export class StoresModule {}
