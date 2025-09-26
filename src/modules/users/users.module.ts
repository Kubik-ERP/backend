// NestJS Libraries
import { Module } from '@nestjs/common';

// Services
import { UsersService } from './services/users.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
