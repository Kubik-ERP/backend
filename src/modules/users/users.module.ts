// NestJS Libraries
import { Module } from '@nestjs/common';

// Services
import { UsersService } from './services/users.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
