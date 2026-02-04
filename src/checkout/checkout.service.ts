import { BadRequestException, Injectable, Req } from '@nestjs/common';
import { Stripe } from 'stripe';

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class CheckoutService {
  private readonly stripe: Stripe;

  private ses = new SESClient({
    region: process.env.AWS_REGION,
    // SEM credentials aqui — o SDK usa a Role do ambiente (ECS/Lambda/EC2)
  });

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is missing');

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    });
  }

  async render(templateFile: string, vars: Record<string, string> = {}) {
    // Em builds/serverless, process.cwd() costuma apontar para a raiz do bundle.
    const fullPath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      templateFile,
    );

    let html = await readFile(fullPath, 'utf8');

    for (const [key, value] of Object.entries(vars)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }

    return html;
  }

  async createCheckoutSession() {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `https://finco.app.br/cadastro`,
      cancel_url: `https://finco.app.br/`,
      customer_email: undefined,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
      },
      branding_settings: {
        display_name: 'FINCO ECOM',
      },
    });

    return { url: session.url };
  }

  async sendEmail(params: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  }) {
    const html = await this.render('welcome.html', {
      NAME: 'Luis Gustavo',
      LINK: 'https://finco.app.br/login',
    });

    const toAddresses = Array.isArray(params.to) ? params.to : [params.to];

    const cmd = new SendEmailCommand({
      Source: 'Suporte Finco <suporte@finco.app.br>',
      Destination: { ToAddresses: toAddresses },
      ReplyToAddresses: ['suporte@finco.app.br'],
      Message: {
        Subject: { Data: 'Pagamento aprovado FINCO!', Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
    });

    return this.ses.send(cmd);
  }

  handleWebhookEvent(@Req() req: Request) {
    try {
      if (!req.body) throw new BadRequestException('Request body is missing');
      // req.body aqui é Buffer (por causa do express.raw)
      const event = this.stripe.webhooks.constructEvent(
        req.body as unknown as Buffer,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      switch (event.type) {
        case 'checkout.session.completed':
          console.log(
            'Pagamento recebido para a sessão:',
            event.data.object.id,
          );
          break;
        case 'customer.subscription.deleted':
          // Lógica para quando o pagamento da fatura falha
          console.log('Conta cancelada:', event.data.object.id);
          break;
        // Adicione mais casos conforme necessário
        default:
          console.log(`Evento não tratado: ${event.type}`);
      }

      return {
        receveid: true,
      };
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err}`);
    }
  }
}
