import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeviceCodesService } from './device-codes.service';
import { DeviceCodesController } from './device-codes.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceCodesController],
  providers: [DeviceCodesService, Reflector],
})
export class DeviceCodesModule {}
