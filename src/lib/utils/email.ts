import nodemailer from 'nodemailer'
import { IOrder } from '../models/Order'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendOrderConfirmationEmail(order: IOrder, emailNote?: string) {
  if (!order.customer.email) return

  const note = emailNote || 'Notre équipe vous appellera pour confirmer votre commande. Pour toute question, contactez-nous sur WhatsApp au +212695504949.'

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f0ede8;">
        <strong>${item.name}</strong><br/>
        <span style="color: #6b6b6b; font-size: 14px;">Taille: ${item.size} • Qté: ${item.quantity}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f0ede8; text-align: right;">
        ${(item.price * item.quantity).toFixed(2)} MAD
      </td>
    </tr>
  `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #f0ede8; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background: #fafafa; border-radius: 4px; overflow: hidden;">

    <div style="background: #0a0a0a; padding: 40px; text-align: center;">
      <h1 style="color: #c9a84c; margin: 0; font-size: 28px; letter-spacing: 4px; text-transform: uppercase;">MARCACLUB</h1>
      <p style="color: #6b6b6b; margin: 8px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Commande Reçue</p>
    </div>

    <div style="padding: 40px;">
      <p style="color: #0a0a0a; font-size: 16px;">Bonjour <strong>${order.customer.name}</strong>,</p>
      <p style="color: #6b6b6b; line-height: 1.6;">
        Merci pour votre commande ! Nous l'avons bien reçue.<br/>
        Un de nos agents vous contactera <strong>très prochainement</strong> pour confirmer votre commande et les détails de livraison.
      </p>

      <div style="background: #f0ede8; padding: 20px; border-radius: 4px; margin: 24px 0; text-align: center;">
        <p style="margin: 0; color: #6b6b6b; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Numéro de commande</p>
        <p style="margin: 8px 0 0; color: #0a0a0a; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${order.orderNumber}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        ${itemsHtml}
        <tr>
          <td style="padding: 16px 12px; font-weight: bold; font-size: 16px;">Total</td>
          <td style="padding: 16px 12px; font-weight: bold; font-size: 16px; text-align: right; color: #c9a84c;">${order.total.toFixed(2)} MAD</td>
        </tr>
      </table>

      <div style="border-top: 1px solid #f0ede8; padding-top: 24px;">
        <h3 style="color: #0a0a0a; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Adresse de livraison</h3>
        <p style="color: #6b6b6b; line-height: 1.6; margin: 8px 0;">
          ${order.customer.address || ''}<br/>
          ${order.customer.city}<br/>
          Tél: ${order.customer.phone}
        </p>
      </div>

      <div style="background: #0a0a0a; color: #c9a84c; padding: 16px; border-radius: 4px; margin-top: 24px; text-align: center; font-size: 14px;">
        Paiement à la livraison (Cash on Delivery)
      </div>

      <div style="background: #fff8e7; border-left: 4px solid #c9a84c; padding: 16px; margin-top: 20px; border-radius: 2px;">
        <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">
          📞 ${note}
        </p>
      </div>
    </div>

    <div style="background: #f0ede8; padding: 24px; text-align: center;">
      <p style="color: #6b6b6b; font-size: 12px; margin: 0;">
        © 2025 Marcaclub — Mode exclusive importée d'Espagne<br/>
        Pour toute question, contactez-nous sur Instagram @marcaclub
      </p>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Marcaclub <noreply@marcaclub.com>',
    to: order.customer.email,
    subject: `📦 Commande reçue — ${order.orderNumber} | Marcaclub`,
    html,
  })
}

export async function sendOrderStatusEmail(order: IOrder, status: string) {
  if (!order.customer.email) return

  const statusConfig: Record<string, { subject: string; title: string; message: string; color: string }> = {
    confirmed: {
      subject: `✅ Commande confirmée — ${order.orderNumber}`,
      title: 'Commande Confirmée',
      message: 'Bonne nouvelle ! Votre commande a été confirmée par notre équipe et sera préparée pour l\'expédition très prochainement.',
      color: '#3b82f6',
    },
    shipped: {
      subject: `🚚 Commande expédiée — ${order.orderNumber}`,
      title: 'Commande Expédiée',
      message: 'Votre commande est en route ! La livraison prendra 24-48h.',
      color: '#8b5cf6',
    },
    delivered: {
      subject: `🎉 Commande livrée — ${order.orderNumber}`,
      title: 'Commande Livrée',
      message: 'DELIVERED_SPECIAL',
      color: '#22c55e',
    },
    cancelled: {
      subject: `❌ Commande annulée — ${order.orderNumber}`,
      title: 'Commande Annulée',
      message: 'Votre commande a été annulée. Pour toute question, contactez-nous sur WhatsApp.',
      color: '#ef4444',
    },
  }

  const cfg = statusConfig[status]
  if (!cfg) return

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; background-color: #f0ede8; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background: #fafafa; border-radius: 4px; overflow: hidden;">
    <div style="background: #0a0a0a; padding: 40px; text-align: center;">
      <h1 style="color: #c9a84c; margin: 0; font-size: 28px; letter-spacing: 4px; text-transform: uppercase;">MARCACLUB</h1>
      <p style="color: #6b6b6b; margin: 8px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">${cfg.title}</p>
    </div>
    <div style="padding: 40px;">
      <p style="color: #0a0a0a; font-size: 16px;">Bonjour <strong>${order.customer.name}</strong>,</p>
      ${cfg.message === 'DELIVERED_SPECIAL' ? `
      <p style="color: #6b6b6b; line-height: 1.6;">Votre commande a bien été livrée. Nous espérons que vous êtes satisfait(e) de votre achat !</p>
      <div style="background: #f9f6f0; border: 1px solid #c9a84c33; padding: 24px; border-radius: 4px; margin: 20px 0; text-align: center; direction: rtl;">
        <p style="margin: 0 0 8px; color: #c9a84c; font-size: 22px;">شكراً جزيلاً</p>
        <p style="margin: 0; color: #555; font-size: 15px; line-height: 1.8;">ثقتكم فينا هي أغلى شيء نملكه<br/>في انتظار لقائكم مجدداً 🤍</p>
      </div>
      ` : `<p style="color: #6b6b6b; line-height: 1.6;">${cfg.message}</p>`}
      <div style="background: #f0ede8; padding: 20px; border-radius: 4px; margin: 24px 0; text-align: center;">
        <p style="margin: 0; color: #6b6b6b; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Numéro de commande</p>
        <p style="margin: 8px 0 0; color: #0a0a0a; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${order.orderNumber}</p>
      </div>
      <div style="background: ${cfg.color}18; border-left: 4px solid ${cfg.color}; padding: 16px; margin-top: 20px; border-radius: 2px; text-align: center;">
        <p style="margin: 0; color: ${cfg.color}; font-size: 16px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">${cfg.title}</p>
      </div>
      <div style="background: #fff8e7; border-left: 4px solid #c9a84c; padding: 16px; margin-top: 20px; border-radius: 2px;">
        <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">
          📞 Pour toute question, contactez-nous sur WhatsApp au +212695504949.
        </p>
      </div>
    </div>
    <div style="background: #f0ede8; padding: 24px; text-align: center;">
      <p style="color: #6b6b6b; font-size: 12px; margin: 0;">© 2025 Marcaclub — Mode exclusive importée d'Espagne</p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Marcaclub <noreply@marcaclub.com>',
    to: order.customer.email,
    subject: cfg.subject,
    html,
  })
}

export async function sendAdminOrderNotification(order: IOrder) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">
        ${item.name} — ${item.size} × ${item.quantity}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${(item.price * item.quantity).toFixed(2)} MAD
      </td>
    </tr>
  `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 30px auto; background: #fff; border-radius: 4px; overflow: hidden; border: 1px solid #e0e0e0;">
    <div style="background: #c9a84c; padding: 24px; text-align: center;">
      <h1 style="color: #0a0a0a; margin: 0; font-size: 20px; letter-spacing: 2px; text-transform: uppercase;">🛍️ Nouvelle Commande</h1>
    </div>
    <div style="padding: 32px;">
      <div style="background: #f9f9f9; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Numéro de commande</p>
        <p style="margin: 0; font-size: 22px; font-weight: bold; color: #0a0a0a;">${order.orderNumber}</p>
      </div>

      <h3 style="color: #0a0a0a; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Client</h3>
      <p style="color: #444; margin: 0 0 4px;"><strong>${order.customer.name}</strong></p>
      <p style="color: #444; margin: 0 0 4px;">📞 ${order.customer.phone}</p>
      <p style="color: #444; margin: 0 0 4px;">📍 ${order.customer.city}</p>
      ${order.customer.email ? `<p style="color: #444; margin: 0 0 4px;">✉️ ${order.customer.email}</p>` : ''}

      <h3 style="color: #0a0a0a; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px;">Articles</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
        <tr>
          <td style="padding: 12px; font-weight: bold;">Total</td>
          <td style="padding: 12px; font-weight: bold; text-align: right; color: #c9a84c;">${order.total.toFixed(2)} MAD</td>
        </tr>
      </table>

      <div style="margin-top: 24px; text-align: center;">
        <a href="${process.env.NEXTAUTH_URL || 'https://marcaclub.vercel.app'}/admin/orders"
           style="background: #0a0a0a; color: #c9a84c; padding: 12px 32px; text-decoration: none; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; border-radius: 2px; display: inline-block;">
          Voir dans l'admin →
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Marcaclub <noreply@marcaclub.com>',
    to: adminEmail,
    subject: `🛍️ Nouvelle commande ${order.orderNumber} — ${order.total.toFixed(0)} MAD`,
    html,
  })
}
