import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'
import { Resend } from 'resend'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    await connectDB()
    const customer = await Customer.findOne({ email: email.toLowerCase().trim() })

    // Always return success to avoid email enumeration
    if (!customer) return NextResponse.json({ ok: true })

    const token = crypto.randomBytes(32).toString('hex')
    customer.resetToken = token
    customer.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await customer.save()

    const baseUrl = process.env.NEXTAUTH_URL || 'https://marca-club.com'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    const year = new Date().getFullYear()
    await resend.emails.send({
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Marcaclub <noreply@marca-club.com>',
      replyTo: 'no-reply@marca-club.com',
      to: customer.email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Bonjour ${customer.name},\n\nNous avons reçu une demande de réinitialisation du mot de passe associé à ce compte.\n\nCliquez sur le lien ci-dessous pour définir un nouveau mot de passe. Ce lien est valable 1 heure.\n\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email. Votre mot de passe ne sera pas modifié.\n\nL'équipe Marcaclub\nmarca-club.com`,
      html: `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Réinitialisation de votre mot de passe</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888888;font-weight:600;">MARCACLUB</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e8e8e8;padding:48px 40px;">

              <!-- Title -->
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#aaaaaa;font-weight:600;">Sécurité du compte</p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">Réinitialisation<br>du mot de passe</h1>

              <!-- Divider -->
              <table role="presentation" width="40" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="height:2px;background-color:#111111;"></td></tr>
              </table>

              <!-- Body -->
              <p style="margin:0 0 16px;font-size:14px;color:#444444;line-height:1.7;">Bonjour <strong style="color:#111111;">${customer.name}</strong>,</p>
              <p style="margin:0 0 32px;font-size:14px;color:#555555;line-height:1.7;">Nous avons reçu une demande de réinitialisation du mot de passe associé à ce compte. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.</p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#111111;">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Réinitialiser le mot de passe</a>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <p style="margin:0 0 24px;font-size:13px;color:#888888;line-height:1.6;">Ce lien expire dans <strong style="color:#555555;">1 heure</strong>. Passé ce délai, vous devrez refaire une demande.</p>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr><td style="height:1px;background-color:#eeeeee;"></td></tr>
              </table>

              <!-- Security note -->
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email. Votre mot de passe restera inchangé et aucune action ne sera effectuée.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#aaaaaa;">Marcaclub &middot; marca-club.com</p>
              <p style="margin:0;font-size:11px;color:#cccccc;">&copy; ${year} Marcaclub. Tous droits reserves.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('forgot-password error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
