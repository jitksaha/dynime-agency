import { Controller, Post, Get, Body, Query, Headers, Res, Param, Sse, MessageEvent, Req, RawBodyRequest } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Response, Request } from 'express';
import { EventService } from '../common/event.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('orders/public')
export class OrdersPublicController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly eventService: EventService,
  ) {}

  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return this.eventService.getUpdateStream().pipe(
      map(({ event, data }) => ({
        data: { event, data },
      } as MessageEvent)),
    );
  }

  @Post('process-payment')
  async processPayment(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
    @Headers('origin') origin?: string,
  ) {
    return this.ordersService.processPayment(body, authHeader, origin || '');
  }

  @Get('bkash-callback')
  async bkashCallback(
    @Query('order') orderId: string,
    @Query('paymentID') paymentID: string,
    @Query('status') status: string,
    @Query('origin') origin: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.ordersService.handleBkashCallback(
      orderId,
      paymentID,
      status,
      origin,
    );
    return res.redirect(redirectUrl);
  }

  @Post('sslcommerz-callback')
  async sslcommerzCallback(
    @Body() body: any,
    @Query('status') statusQuery: string,
    @Query('origin') originQuery: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.ordersService.handleSslcommerzCallback(body, statusQuery, originQuery);
    return res.redirect(redirectUrl);
  }

  @Get('invoice/:ref')
  async getPublicInvoice(@Param('ref') ref: string) {
    return this.ordersService.findPublicInvoice(ref);
  }

  @Get('lookup')
  async lookupOrders(@Query('email') email: string) {
    return this.ordersService.lookupOrdersByEmail(email);
  }

  @Get('status-by-session/:sessionId')
  async getStatusBySession(@Param('sessionId') sessionId: string) {
    return this.ordersService.getStatusBySession(sessionId);
  }

  @Get('track/:term')
  async trackOrder(@Param('term') term: string) {
    return this.ordersService.trackOrder(term);
  }

  @Get(':id/verification')
  async getVerificationDetails(
    @Param('id') id: string,
    @Query('sync_mock') syncMock?: string,
  ) {
    return this.ordersService.getVerificationDetails(id, syncMock === 'true');
  }

  @Post(':id/verification/start')
  async startVerification(
    @Param('id') id: string,
    @Body('origin') origin?: string,
  ) {
    return this.ordersService.startVerification(id, origin || '');
  }

  @Post(':id/verification/mock-complete')
  async mockComplete(
    @Param('id') id: string,
    @Body('decision') decision: 'verified' | 'rejected',
  ) {
    return this.ordersService.mockCompleteVerification(id, decision);
  }

  @Post('stripe-webhook')
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
    return this.ordersService.handleStripeWebhook(rawBody, signature);
  }

  @Post('dodopayment-webhook')
  async dodoWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-dodo-signature') signature: string,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
    return this.ordersService.handleDodoWebhook(rawBody, signature);
  }

  @Post('keeal-webhook')
  async keealWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('keeal-signature') signature: string,
    @Headers('stripe-signature') stripeSignature: string,
    @Headers('x-keeal-signature') xSignature: string,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
    const sig = signature || stripeSignature || xSignature;
    return this.ordersService.handleKeealWebhook(rawBody, sig);
  }
}
