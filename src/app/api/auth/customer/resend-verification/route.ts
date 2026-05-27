import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    await connectDB()
    const customer = await Customer.findOne({ email: email.toLowerCase().trim() })

    // Always return ok to avoid enumeration
    if (!customer || customer.emailVerified) return NextResponse.json({ ok: true })

    const token = crypto.randomBytes(32).toString('hex')
    customer.emailVerificationToken = token
    customer.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await customer.save()

    const baseUrl = process.env.NEXTAUTH_URL || 'https://marca-club.com'
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`
    const year = new Date().getFullYear()

    resend.emails.send({
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Marcaclub <noreply@marca-club.com>',
      to: customer.email,
      subject: 'Activez votre compte Marcaclub',
      text: `Bonjour ${customer.name},\n\nCliquez sur le lien ci-dessous pour activer votre compte. Ce lien est valable 24 heures.\n\n${verifyUrl}\n\nL'équipe Marcaclub`,
      html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Activez votre compte</title></head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
        <tr><td style="padding:0 0 24px 0;text-align:center;">
          <p style="margin:0;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888888;font-weight:600;">MARCACLUB</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;border:1px solid #e8e8e8;padding:48px 40px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#aaaaaa;font-weight:600;">Confirmation de compte</p>
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">Activez votre<br>compte</h1>
          <table role="presentation" width="40" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="height:2px;background-color:#111111;"></td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:14px;color:#444444;line-height:1.7;">Bonjour <strong style="color:#111111;">${customer.name}</strong>,</p>
          <p style="margin:0 0 32px;font-size:14px;color:#555555;line-height:1.7;">Cliquez sur le bouton ci-dessous pour activer votre compte Marcaclub.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background-color:#111111;">
              <a href="${verifyUrl}" style="display:inline-block;padding:14px 36px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Activer mon compte</a>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:13px;color:#888888;line-height:1.6;">Ce lien expire dans <strong style="color:#555555;">24 heures</strong>.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="height:1px;background-color:#eeeeee;"></td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">Si vous n'avez pas créé ce compte, ignorez cet email.</p>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#aaaaaa;">Marcaclub &middot; marca-club.com</p>
          <p style="margin:0;font-size:11px;color:#cccccc;">&copy; ${year} Marcaclub. Tous droits reserves.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }).catch(err => console.error('Resend verification email error:', err))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('resend-verification error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
