import { PrismaClient } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  let client: ImapFlow | null = null;

  try {
    console.log('Fetching SMTP/IMAP config from database...');
    const setting = await prisma.notification_settings.findUnique({
      where: { key: 'smtp_config' },
    });

    if (!setting || !setting.value) {
      console.error('SMTP configuration not found in database settings');
      return;
    }

    const config = setting.value as any;
    if (!config.username || !config.password) {
      console.error('SMTP credentials missing in database settings');
      return;
    }

    const imapHost = config.host ? config.host.replace('smtp.', 'imap.') : 'imap.hostinger.com';
    console.log(`Connecting to IMAP Server: ${imapHost}:993 with user: ${config.username}`);

    client = new ImapFlow({
      host: imapHost,
      port: 993,
      secure: true,
      auth: {
        user: config.username,
        pass: config.password,
      },
      logger: false,
      tls: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log('Connected to IMAP server successfully!');

    console.log('Locking INBOX...');
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Find mailbox info
      console.log('Mailbox status:', client.mailbox);

      // Fetch the latest 5 messages
      const searchRange = '*:5';
      console.log(`Fetching messages in range: ${searchRange}`);
      const messages = client.fetch({ seq: '1:5' }, {
        source: true,
        uid: true,
        flags: true,
        envelope: true
      });

      let count = 0;
      for await (const message of messages) {
        count++;
        console.log(`\n--- Message #${count} (UID: ${message.uid}) ---`);
        console.log('Subject:', message.envelope?.subject);
        console.log('From:', message.envelope?.from?.[0]?.address);
        console.log('Date:', message.envelope?.date);

        if (message.source) {
          const parsed: any = await simpleParser(message.source);
          console.log('Parsed Subject:', parsed.subject);
          console.log('Parsed From Email:', parsed.from?.value?.[0]?.address);
          console.log('Snippet:', parsed.text?.slice(0, 150) || '(No text content)');
        }
      }
      console.log(`\nProcessed ${count} messages.`);
    } finally {
      lock.release();
      console.log('Released mailbox lock.');
    }

    await client.logout();
    console.log('Logged out from IMAP server.');

  } catch (err) {
    console.error('IMAP testing failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
