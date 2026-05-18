import { Resend } from 'resend'
import { IOrder } from '../models/Order'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

function getFrom() {
  return process.env.EMAIL_FROM || 'Marcaclub <orders@marcaclub.ma>'
}

export async function sendOrderConfirmationEmail(order: IOrder, emailNote?: string) {
  if (!order.customer.email) return

  const note = emailNote || 'Notre équipe vous appellera pour confirmer votre commande. Pour toute question, contactez-nous sur WhatsApp au +212695504949.'

  const itemsList = order.items
    .map((item) => `  - ${item.name} (Taille: ${item.size}, Qté: ${item.quantity}) — ${(item.price * item.quantity).toFixed(2)} MAD`)
    .join('\n')

  const itemsHtml = order.items
    .map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f0ede8;">
        <strong>${item.name}</strong><br/>
        <span style="color: #6b6b6b; font-size: 14px;">Taille: ${item.size} &bull; Qté: ${item.quantity}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f0ede8; text-align: right;">
        ${(item.price * item.quantity).toFixed(2)} MAD
      </td>
    </tr>`)
    .join('')

  const text = `
Bonjour ${order.customer.name},

Merci pour votre commande chez Marcaclub !
Nous l'avons bien reçue et un agent vous contactera très prochainement pour confirmer.

Numéro de commande : ${order.orderNumber}

Articles commandés :
${itemsList}

Total : ${order.total.toFixed(2)} MAD (paiement à la livraison)

Adresse de livraison :
${order.customer.address || ''}
${order.customer.city}
Tel : ${order.customer.phone}

${note}

---
Marcaclub — Mode exclusive importée d'Espagne
Instagram : @marcaclub
`.trim()

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Commande reçue — Marcaclub</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ede8;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fafafa;border-radius:4px;overflow:hidden;">
    <div style="background:#0a0a0a;padding:40px;text-align:center;">
      <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:4px;text-transform:uppercase;">MARCACLUB</h1>
      <p style="color:#6b6b6b;margin:8px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Commande Reçue</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#0a0a0a;font-size:16px;">Bonjour <strong>${order.customer.name}</strong>,</p>
      <p style="color:#6b6b6b;line-height:1.6;">Merci pour votre commande ! Nous l'avons bien reçue.<br/>Un de nos agents vous contactera <strong>très prochainement</strong> pour confirmer votre commande et les détails de livraison.</p>
      <div style="background:#f0ede8;padding:20px;border-radius:4px;margin:24px 0;text-align:center;">
        <p style="margin:0;color:#6b6b6b;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Numéro de commande</p>
        <p style="margin:8px 0 0;color:#0a0a0a;font-size:24px;font-weight:bold;letter-spacing:2px;">${order.orderNumber}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        ${itemsHtml}
        <tr>
          <td style="padding:16px 12px;font-weight:bold;font-size:16px;">Total</td>
          <td style="padding:16px 12px;font-weight:bold;font-size:16px;text-align:right;color:#c9a84c;">${order.total.toFixed(2)} MAD</td>
        </tr>
      </table>
      <div style="border-top:1px solid #f0ede8;padding-top:24px;">
        <h3 style="color:#0a0a0a;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Adresse de livraison</h3>
        <p style="color:#6b6b6b;line-height:1.6;margin:8px 0;">${order.customer.address || ''}<br/>${order.customer.city}<br/>Tél: ${order.customer.phone}</p>
      </div>
      <div style="background:#0a0a0a;color:#c9a84c;padding:16px;border-radius:4px;margin-top:24px;text-align:center;font-size:14px;">Paiement à la livraison (Cash on Delivery)</div>
      <div style="background:#fff8e7;border-left:4px solid #c9a84c;padding:16px;margin-top:20px;border-radius:2px;">
        <p style="margin:0;color:#333;font-size:14px;line-height:1.6;">${note}</p>
      </div>
    </div>
    <div style="background:#f0ede8;padding:24px;text-align:center;">
      <p style="color:#6b6b6b;font-size:12px;margin:0;">Marcaclub — Mode exclusive importée d'Espagne<br/>Instagram @marcaclub</p>
    </div>
  </div>
</body>
</html>`

  await getResend().emails.send({
    from: getFrom(),
    to: order.customer.email,
    replyTo: process.env.EMAIL_USER,
    subject: `Commande reçue N°${order.orderNumber} — Marcaclub`,
    text,
    html,
  })
}

export async function sendOrderStatusEmail(order: IOrder, status: string) {
  if (!order.customer.email) return

  type StatusCfg = { subject: string; title: string; message: string; textMessage: string; color: string }
  const statusConfig: Record<string, StatusCfg> = {
    confirmed: {
      subject: `Commande confirmée N°${order.orderNumber} — Marcaclub`,
      title: 'Commande Confirmée',
      message: 'Bonne nouvelle ! Votre commande a été confirmée par notre équipe et sera préparée pour l\'expédition très prochainement.',
      textMessage: 'Bonne nouvelle ! Votre commande a été confirmée par notre équipe et sera préparée pour l\'expédition très prochainement.',
      color: '#3b82f6',
    },
    shipped: {
      subject: `Commande expédiée N°${order.orderNumber} — Marcaclub`,
      title: 'Commande Expédiée',
      message: 'Votre commande est en route ! La livraison prendra 24-48h.',
      textMessage: 'Votre commande est en route ! La livraison prendra 24-48h.',
      color: '#8b5cf6',
    },
    delivered: {
      subject: `Commande livrée N°${order.orderNumber} — Marcaclub`,
      title: 'Commande Livrée',
      message: 'DELIVERED_SPECIAL',
      textMessage: 'Votre commande a bien été livrée. Merci pour votre confiance ! شكراً جزيلاً — في انتظار لقائكم مجدداً.',
      color: '#22c55e',
    },
    cancelled: {
      subject: `Commande annulée N°${order.orderNumber} — Marcaclub`,
      title: 'Commande Annulée',
      message: 'Votre commande a été annulée. Pour toute question, contactez-nous sur WhatsApp.',
      textMessage: 'Votre commande a été annulée. Pour toute question, contactez-nous sur WhatsApp au +212695504949.',
      color: '#ef4444',
    },
  }

  const cfg = statusConfig[status]
  if (!cfg) return

  const text = `
Bonjour ${order.customer.name},

${cfg.textMessage}

Numéro de commande : ${order.orderNumber}
Statut : ${cfg.title}

Pour toute question, contactez-nous sur WhatsApp au +212695504949.

---
Marcaclub — Mode exclusive importée d'Espagne
`.trim()

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${cfg.title} — Marcaclub</title></head>
<body style="margin:0;padding:0;background-color:#f0ede8;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fafafa;border-radius:4px;overflow:hidden;">
    <div style="background:#0a0a0a;padding:40px;text-align:center;">
      <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:4px;text-transform:uppercase;">MARCACLUB</h1>
      <p style="color:#6b6b6b;margin:8px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${cfg.title}</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#0a0a0a;font-size:16px;">Bonjour <strong>${order.customer.name}</strong>,</p>
      ${cfg.message === 'DELIVERED_SPECIAL' ? `
      <p style="color:#6b6b6b;line-height:1.6;">Votre commande a bien été livrée. Nous espérons que vous êtes satisfait(e) de votre achat !</p>
      <div style="background:#f9f6f0;border:1px solid #c9a84c33;padding:24px;border-radius:4px;margin:20px 0;text-align:center;direction:rtl;">
        <p style="margin:0 0 8px;color:#c9a84c;font-size:22px;">شكراً جزيلاً</p>
        <p style="margin:0;color:#555;font-size:15px;line-height:1.8;">ثقتكم فينا هي أغلى شيء نملكه<br/>في انتظار لقائكم مجدداً</p>
      </div>` : `<p style="color:#6b6b6b;line-height:1.6;">${cfg.message}</p>`}
      <div style="background:#f0ede8;padding:20px;border-radius:4px;margin:24px 0;text-align:center;">
        <p style="margin:0;color:#6b6b6b;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Numéro de commande</p>
        <p style="margin:8px 0 0;color:#0a0a0a;font-size:24px;font-weight:bold;letter-spacing:2px;">${order.orderNumber}</p>
      </div>
      <div style="background:${cfg.color}18;border-left:4px solid ${cfg.color};padding:16px;margin-top:20px;border-radius:2px;text-align:center;">
        <p style="margin:0;color:${cfg.color};font-size:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${cfg.title}</p>
      </div>
      <div style="background:#fff8e7;border-left:4px solid #c9a84c;padding:16px;margin-top:20px;border-radius:2px;">
        <p style="margin:0;color:#333;font-size:14px;line-height:1.6;">Pour toute question, contactez-nous sur WhatsApp au +212695504949.</p>
      </div>
    </div>
    <div style="background:#f0ede8;padding:24px;text-align:center;">
      <p style="color:#6b6b6b;font-size:12px;margin:0;">Marcaclub — Mode exclusive importée d'Espagne</p>
    </div>
  </div>
</body>
</html>`

  await getResend().emails.send({
    from: getFrom(),
    to: order.customer.email,
    replyTo: process.env.EMAIL_USER,
    subject: cfg.subject,
    text,
    html,
  })
}

export async function sendAdminOrderNotification(order: IOrder) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const itemsHtml = order.items
    .map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${item.name} — ${item.size} x ${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${(item.price * item.quantity).toFixed(2)} MAD</td>
    </tr>`)
    .join('')

  const text = `
Nouvelle commande : ${order.orderNumber}
Total : ${order.total.toFixed(0)} MAD

Client : ${order.customer.name}
Tel : ${order.customer.phone}
Ville : ${order.customer.city}
${order.customer.email ? `Email : ${order.customer.email}` : ''}

Articles :
${order.items.map((i) => `  - ${i.name} (${i.size}) x${i.quantity}`).join('\n')}

Admin : ${process.env.NEXTAUTH_URL || 'https://marcaclub.vercel.app'}/admin/orders
`.trim()

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0;">
    <div style="background:#c9a84c;padding:24px;text-align:center;">
      <h1 style="color:#0a0a0a;margin:0;font-size:20px;letter-spacing:2px;text-transform:uppercase;">Nouvelle Commande</h1>
    </div>
    <div style="padding:32px;">
      <div style="background:#f9f9f9;padding:16px;border-radius:4px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Numéro de commande</p>
        <p style="margin:0;font-size:22px;font-weight:bold;color:#0a0a0a;">${order.orderNumber}</p>
      </div>
      <h3 style="color:#0a0a0a;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Client</h3>
      <p style="color:#444;margin:0 0 4px;"><strong>${order.customer.name}</strong></p>
      <p style="color:#444;margin:0 0 4px;">${order.customer.phone}</p>
      <p style="color:#444;margin:0 0 4px;">${order.customer.city}</p>
      ${order.customer.email ? `<p style="color:#444;margin:0 0 4px;">${order.customer.email}</p>` : ''}
      <h3 style="color:#0a0a0a;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:24px 0 8px;">Articles</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${itemsHtml}
        <tr>
          <td style="padding:12px;font-weight:bold;">Total</td>
          <td style="padding:12px;font-weight:bold;text-align:right;color:#c9a84c;">${order.total.toFixed(2)} MAD</td>
        </tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${process.env.NEXTAUTH_URL || 'https://marcaclub.vercel.app'}/admin/orders" style="background:#0a0a0a;color:#c9a84c;padding:12px 32px;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;display:inline-block;">Voir dans l'admin</a>
      </div>
    </div>
  </div>
</body>
</html>`

  await getResend().emails.send({
    from: getFrom(),
    to: adminEmail,
    subject: `Nouvelle commande ${order.orderNumber} — ${order.total.toFixed(0)} MAD`,
    text,
    html,
  })
}
