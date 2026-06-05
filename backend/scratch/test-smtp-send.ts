import { PrismaClient } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    const setting = await prisma.notification_settings.findUnique({
      where: { key: 'smtp_config' },
    });

    if (!setting || !setting.value) {
      console.error('SMTP configuration not found in database settings');
      return;
    }

    const config = setting.value as any;
    console.log('Using SMTP Config:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      from_name: config.from_name,
      from_email: config.from_email
    });

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port || 587),
      secure: config.port === 465 || !!config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"${config.from_name || 'Dynime Test'}" <${config.from_email || config.username}>`,
      to: 'mail.dynime@gmail.com',
      subject: 'SMTP Connection Test — Dynime',
      text: 'Hello from Dynime! This is a test email sent using nodemailer and Hostinger SMTP configuration loaded directly from the Supabase database.',
      html: '<h3>Hello from Dynime!</h3><p>This is a test email sent using nodemailer and Hostinger SMTP configuration loaded directly from the Supabase database.</p>'
    });

    console.log('Email sent successfully! MessageID:', info.messageId);

  } catch (err) {
    console.error('Error sending test email:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
