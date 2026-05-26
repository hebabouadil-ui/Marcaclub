import { Resend } from 'resend'
import { IOrder } from '../models/Order'

function esc(s: string | undefined): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

function getFrom() {
  return process.env.EMAIL_FROM || 'Marcaclub <orders@marca-club.com>'
}

function baseHtml(content: string, preheader = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Marcaclub</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#111827;padding:32px;text-align:center;">
      <h1 style="color:#f59e0b;margin:0;font-size:24px;letter-spacing:6px;font-weight:900;">MARCACLUB</h1>
      <p style="color:#9ca3af;margin:6px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Premium Global Store</p>
    </div>
    <!-- Content -->
    ${content}
    <!-- Footer -->
    <div style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">© ${new Date().getFullYear()} Marcaclub · All rights reserved</p>
      <p style="color:#9ca3af;font-size:11px;margin:0;">Questions? <a href="mailto:support@marca-club.com" style="color:#6b7280;">support@marca-club.com</a></p>
    </div>
  </div>
</body>
</html>`
}

function fmtMoney(order: IOrder, amount: number) {
  const sym = (order as IOrder & { currencySymbol?: string }).currencySymbol ?? 'CA$'
  return `${sym}${amount.toFixed(2)}`
}

function itemsTable(order: IOrder) {
  const rows = order.items.map((item) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${esc(item.name)}</p>
        <p style="margin:3px 0 0;font-size:12px;color:#9ca3af;">Size: ${esc(item.size)} &bull; Qty: ${item.quantity}</p>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:600;color:#111827;">
        ${fmtMoney(order, item.price * item.quantity)}
      </td>
    </tr>`).join('')

  return `<table style="width:100%;border-collapse:collapse;">${rows}
    <tr>
      <td style="padding:12px 0;color:#6b7280;font-size:13px;">Shipping</td>
      <td style="padding:12px 0;text-align:right;font-size:13px;color:#16a34a;font-weight:600;">Included</td>
    </tr>
    <tr>
      <td style="padding:14px 0 0;font-size:16px;font-weight:700;color:#111827;border-top:2px solid #111827;">Total Paid</td>
      <td style="padding:14px 0 0;text-align:right;font-size:16px;font-weight:700;color:#111827;border-top:2px solid #111827;">${fmtMoney(order, order.total)}</td>
    </tr>
  </table>`
}

function shippingBlock(order: IOrder) {
  const c = order.customer
  return `
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">Ship To</p>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
      ${esc(c.name)}<br/>
      ${esc(c.address)}<br/>
      ${esc(c.city)}${c.state ? `, ${esc(c.state)}` : ''} ${esc(c.postalCode)}<br/>
      ${esc(c.country)}
    </p>
  </div>`
}

function badge(text: string, color: string) {
  return `<div style="display:inline-block;background:${color}18;border:1px solid ${color}40;color:${color};padding:6px 16px;border-radius:99px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${text}</div>`
}

// ─── 1. Order Confirmation ──────────────────────────────────────────────────
export async function sendOrderConfirmationEmail(order: IOrder, _emailNote?: string) {
  if (!order.customer.email) return
  if (!process.env.RESEND_API_KEY) { console.error('sendOrderConfirmationEmail: RESEND_API_KEY not set'); return }

  const content = `
  <div style="padding:32px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:56px;height:56px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:24px;">✓</span>
      </div>
      <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827;">Order Confirmed!</h2>
      <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Thank you for your purchase, ${esc(order.customer.name)}.</p>
    </div>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">Order Number</p>
      <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:#111827;font-family:monospace;">#${order.orderNumber}</p>
    </div>

    <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 24px;">Your payment has been processed successfully and your order is now being prepared. You'll receive a shipping notification with tracking information once your order is on its way.</p>

    <h3 style="font-size:13px;font-weight:700;color:#111827;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px;">Order Summary</h3>
    ${itemsTable(order)}
    ${shippingBlock(order)}

    <div style="margin-top:24px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        📦 <strong>Estimated delivery:</strong> 7–12 business days<br/>
        ✉️ A tracking number will be emailed to you once shipped
      </p>
    </div>
  </div>`

  await getResend().emails.send({
    from: getFrom(),
    to: order.customer.email,
    replyTo: process.env.EMAIL_USER || undefined,
    subject: `Order Confirmed #${order.orderNumber} — Marcaclub`,
    html: baseHtml(content, `Your order #${order.orderNumber} is confirmed and being processed.`),
    text: `Order Confirmed #${order.orderNumber}\n\nThank you ${order.customer.name}!\n\nYour payment was successful. Estimated delivery: 7–12 business days.\n\nTotal paid: ${fmtMoney(order, order.total)}\n\nQuestions? support@marca-club.com`,
  })
}

// ─── 2. Order Status Updates ────────────────────────────────────────────────
export async function sendOrderStatusEmail(order: IOrder, status: string) {
  if (!order.customer.email) return
  if (!process.env.RESEND_API_KEY) { console.error('sendOrderStatusEmail: RESEND_API_KEY not set'); return }

  // 'confirmed' status does NOT send a second email — the customer already received
  // sendOrderConfirmationEmail at checkout. Only ship/deliver/cancel trigger status emails.
  type Cfg = { subject: string; title: string; badgeText: string; badgeColor: string; body: string; emoji: string }
  const configs: Record<string, Cfg> = {
    shipped: {
      subject: `Your order has shipped #${order.orderNumber}`,
      title: 'Order Shipped',
      badgeText: 'Shipped',
      badgeColor: '#8b5cf6',
      emoji: '🚚',
      body: `Your order is on its way! Estimated delivery: 7–15 business days from your order date.${order.cjTrackingNumber ? `<br/><br/>Your tracking number: <strong style="font-family:monospace;font-size:16px;">${order.cjTrackingNumber}</strong>` : ''}<br/><br/><div style="text-align:center;margin:20px 0;"><a href="https://marca-club.com/track/${order.orderNumber}" style="display:inline-block;background:#f59e0b;color:#111827;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:1px;">Track Your Order</a></div><p style="color:#9ca3af;font-size:12px;text-align:center;">Live tracking updates are available on your order page</p>`,
    },
    delivered: {
      subject: `Your order has been delivered #${order.orderNumber}`,
      title: 'Order Delivered',
      badgeText: 'Delivered',
      badgeColor: '#16a34a',
      emoji: '🎉',
      body: `Your order has been delivered! We hope you love your purchase. If you have any questions or concerns, don't hesitate to reach out — we're here to help.`,
    },
    cancelled: {
      subject: `Order cancelled #${order.orderNumber}`,
      title: 'Order Cancelled',
      badgeText: 'Cancelled',
      badgeColor: '#ef4444',
      emoji: '❌',
      body: `Your order has been cancelled. If you were charged, a full refund will be processed to your original payment method within 5–10 business days. Need help? Contact us at support@marca-club.com.`,
    },
  }

  const cfg = configs[status]
  if (!cfg) return

  const content = `
  <div style="padding:32px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:12px;">${cfg.emoji}</div>
      <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827;">${cfg.title}</h2>
      <div style="margin-top:10px;">${badge(cfg.badgeText, cfg.badgeColor)}</div>
    </div>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">Order Number</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#111827;font-family:monospace;">#${order.orderNumber}</p>
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 24px;">Hi <strong>${esc(order.customer.name)}</strong>, ${cfg.body}</p>

    <h3 style="font-size:13px;font-weight:700;color:#111827;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px;">Order Summary</h3>
    ${itemsTable(order)}
    ${shippingBlock(order)}

    <div style="margin-top:24px;text-align:center;">
      <a href="https://marca-club.com" style="display:inline-block;background:#111827;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Shop More at Marcaclub</a>
    </div>
  </div>`

  await getResend().emails.send({
    from: getFrom(),
    to: order.customer.email,
    replyTo: process.env.EMAIL_USER || undefined,
    subject: cfg.subject,
    html: baseHtml(content, cfg.body.replace(/<[^>]+>/g, '')),
    text: `${cfg.title} — Order #${order.orderNumber}\n\nHi ${order.customer.name},\n\n${cfg.body.replace(/<[^>]+>/g, '')}\n\nTotal: ${fmtMoney(order, order.total)}\n\nQuestions? support@marca-club.com`,
  })
}

// ─── 3. Admin Notification ──────────────────────────────────────────────────
export async function sendAdminOrderNotification(order: IOrder) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) { console.error('Admin notification skipped: ADMIN_EMAIL not set'); return }

  const c = order.customer
  const itemsText = order.items.map((i) => `  • ${i.name} (${i.size}) × ${i.quantity} — ${fmtMoney(order, i.price * i.quantity)}`).join('\n')
  const itemsHtml = order.items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${esc(i.name)} <span style="color:#9ca3af;">× ${i.quantity} · ${esc(i.size)}</span></td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;color:#111827;">${fmtMoney(order, i.price * i.quantity)}</td>
    </tr>`).join('')

  const content = `
  <div style="padding:28px;">
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#92400e;">🛒 NEW ORDER RECEIVED</p>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">Order #</p>
      <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:#111827;font-family:monospace;">${order.orderNumber}</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#16a34a;">${fmtMoney(order, order.total)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Customer</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;">${esc(c.name)}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Phone</td><td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;">${esc(c.phone)}</td></tr>
      ${c.email ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Email</td><td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;">${esc(c.email)}</td></tr>` : ''}
      <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Ship To</td><td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;">${esc(c.city)}, ${esc(c.country)}</td></tr>
    </table>
    <h3 style="font-size:12px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;">Items</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${itemsHtml}
      <tr><td style="padding:12px 0;font-weight:700;color:#111827;">Total</td><td style="padding:12px 0;text-align:right;font-weight:700;color:#16a34a;">${fmtMoney(order, order.total)}</td></tr>
    </table>
    <div style="text-align:center;">
      <a href="https://admin.marca-club.com" style="display:inline-block;background:#111827;color:#f59e0b;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;">VIEW IN ADMIN</a>
    </div>
  </div>`

  await getResend().emails.send({
    from: getFrom(),
    to: adminEmail,
    subject: `New Order #${order.orderNumber} — ${fmtMoney(order, order.total)} — ${c.name}`,
    html: baseHtml(content, `New order from ${c.name} · ${fmtMoney(order, order.total)}`),
    text: `New Order #${order.orderNumber}\n\nCustomer: ${c.name}\nPhone: ${c.phone}\nCity: ${c.city}, ${c.country}\nTotal: ${fmtMoney(order, order.total)}\n\nItems:\n${itemsText}\n\nAdmin: https://admin.marca-club.com`,
  })
}
