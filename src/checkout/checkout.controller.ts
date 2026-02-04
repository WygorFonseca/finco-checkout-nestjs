import { Controller, Post, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  createCheckout() {
    return this.checkoutService.createCheckoutSession();
  }

  @Post('webhook')
  handleWebhook(@Req() req: Request) {
    return this.checkoutService.handleWebhookEvent(req);
  }

  @Post('send-email')
  sendEmail() {
    return this.checkoutService.sendEmail({
      to: 'luisgustavomontagnini@outlook.com',
      subject: 'Teste de email via AWS SES',
      text: 'Este é um email de teste enviado via AWS SES usando NestJS!',
    });
  }
}
