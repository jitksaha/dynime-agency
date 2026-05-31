/**
 * Handles the Didit webhook at the exact path configured on the Didit account:
 *   POST /api/webhooks/didit
 *
 * This is registered VERSION-NEUTRAL so NestJS does NOT add a /v1/ prefix.
 * The global API prefix ("api") is still applied by main.ts.
 */
import {
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Request } from 'express';
import { VerificationService } from './verification.service';

@Controller({ path: 'webhooks/didit', version: VERSION_NEUTRAL })
export class WebhookController {
  constructor(private readonly svc: VerificationService) {}

  @Post()
  async handle(
    @Req() req: Request,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const raw = (req as RawBodyRequest<Request>).rawBody?.toString('utf-8') ?? '';
    return this.svc.handleWebhook(raw, headers);
  }
}
