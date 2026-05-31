import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export const winstonConfig: WinstonModuleOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  format:
    process.env.NODE_ENV === 'production'
      ? winston.format.combine(winston.format.timestamp(), winston.format.json())
      : winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, context }) => {
            return `${timestamp} [${context ?? 'App'}] ${level}: ${message}`;
          }),
        ),
  transports: [new winston.transports.Console()],
};
