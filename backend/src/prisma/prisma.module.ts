import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EventService } from '../common/event.service';

@Global()
@Module({
  providers: [PrismaService, EventService],
  exports: [PrismaService, EventService],
})
export class PrismaModule {}
