import { BadRequestException, Injectable, Req } from '@nestjs/common';
import { Stripe } from 'stripe';

@Injectable()
export class CheckoutService {
  private readonly stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is missing');

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    });
  }

  async createCheckoutSession() {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: 'price_1Srjlg9aLFU4MluLFPIZSMzL', quantity: 1 }],
      success_url: `https://finco.app.br/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://finco.app.br/checkout/cancelado`,
      customer_email: undefined,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
      },
    });

    return { url: session.url };
  }

  handleWebhookEvent(@Req() req: Request) {
    try {
      // req.body aqui é Buffer (por causa do express.raw)
      const event = this.stripe.webhooks.constructEvent(
        JSON.stringify(req.body),
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      if (event.type === 'checkout.session.completed') {
        console.log('Pagamento recebido para a sessão:', event.data.object.id);
      }

      return {
        receveid: true,
      };
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err}`);
    }
  }
}
