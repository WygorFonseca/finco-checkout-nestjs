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
}
