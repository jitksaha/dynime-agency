import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { ImapService } from './imap.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [MailService, ImapService],
  exports: [MailService],
})
export class MailModule {}
