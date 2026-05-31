import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true, // required for HMAC signature verification on webhook endpoints
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(helmet());
  app.use(compression());

  // Behind the Nginx gateway: trust the first proxy hop so client IPs
  // (and therefore rate limiting) are accurate.
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  const isProd = process.env.NODE_ENV === 'production';
  const corsOrigins = (process.env.CORS_ORIGINS ?? (isProd ? '' : '*'))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowWildcard = corsOrigins.includes('*');

  // Credentialed CORS must never be combined with a wildcard origin.
  if (isProd && (allowWildcard || corsOrigins.length === 0)) {
    throw new Error(
      'CORS_ORIGINS must be an explicit, non-wildcard allowlist in production (credentials are enabled).',
    );
  }

  app.enableCors({
    origin: allowWildcard ? true : corsOrigins,
    credentials: !allowWildcard,
  });

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Dynime API')
      .setDescription('Dynime backend API (Supabase migration target)')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
