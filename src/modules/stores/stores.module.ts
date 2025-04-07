import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtConfigModule } from 'src/configurations/jwt/jwt-configuration.module';
import { JwtConfigService } from 'src/configurations/jwt/jwt-configuration.service';
import { StoresController } from './controllers/stores.controller';
import { StoresService } from './services/stores.service';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';

@Module({
  imports: [
    JwtConfigModule,
    PrismaModule,
    PassportModule,
    AuthenticationModule
  ],
  controllers: [StoresController],
  providers: [StoresService, JwtStrategy],
})
export class StoresModule {}
