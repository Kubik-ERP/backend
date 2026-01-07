import { Module } from '@nestjs/common';
import { BayarindService } from './bayarind.service';
import { BayarindController } from './bayarind.controller';

@Module({
  controllers: [BayarindController],
  providers: [BayarindService],
})
export class BayarindModule {}
