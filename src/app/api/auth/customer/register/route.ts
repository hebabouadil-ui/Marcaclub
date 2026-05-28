import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import crypto from 'crypto'
import { Resend } from 'resend'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { email, name, password } = await req.json()
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await connectDB()
    const existing = await Customer.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const customer = await Customer.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    })

    // Send verification email
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set — verification email not sent')
    }
    const baseUrl = process.env.NEXTAUTH_URL || 'https://marca-club.com'
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`
    const year = new Date().getFullYear()
    const emailResult = await resend.emails.send({
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Marcaclub <noreply@marca-club.com>',
      to: customer.email,
      subject: 'Activez votre compte Marcaclub',
      text: `Bonjour ${customer.name},\n\nMerci de vous être inscrit sur Marcaclub.\n\nCliquez sur le lien ci-dessous pour activer votre compte. Ce lien est valable 24 heures.\n\n${verifyUrl}\n\nSi vous n'avez pas créé ce compte, ignorez cet email.\n\nL'équipe Marcaclub\nmarca-club.com`,
      html: `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Activez votre compte Marcaclub</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">

          <tr>
            <td style="padding:0 0 24px 0;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#888888;font-weight:600;">MARCACLUB</p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;border:1px solid #e8e8e8;padding:48px 40px;">

              <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#aaaaaa;font-weight:600;">Confirmation de compte</p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">Activez votre<br>compte</h1>

              <table role="presentation" width="40" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="height:2px;background-color:#111111;"></td></tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;color:#444444;line-height:1.7;">Bonjour <strong style="color:#111111;">${customer.name}</strong>,</p>
              <p style="margin:0 0 32px;font-size:14px;color:#555555;line-height:1.7;">Merci de vous être inscrit sur Marcaclub. Cliquez sur le bouton ci-dessous pour activer votre compte et commencer vos achats.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#111111;">
                    <a href="${verifyUrl}" style="display:inline-block;padding:14px 36px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Activer mon compte</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#888888;line-height:1.6;">Ce lien expire dans <strong style="color:#555555;">24 heures</strong>. Passé ce délai, vous devrez refaire une demande.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr><td style="height:1px;background-color:#eeeeee;"></td></tr>
              </table>

              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">Si vous n'avez pas créé ce compte, ignorez simplement cet email. Aucune action ne sera effectuée.</p>
            </td>
          </tr>

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
    const emailSent = !emailResult.error
    if (emailResult.error) {
      console.error('Verification email send error:', JSON.stringify(emailResult.error))
    } else {
      console.log('Verification email sent, id:', emailResult.data?.id)
    }

    const customerId = String(customer._id)
    const token = await new SignJWT({ sub: customerId, email: customer.email, name: customer.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET)
    const res = NextResponse.json({ _id: customerId, email: customer.email, name: customer.name, emailSent })
    res.cookies.set('mc-customer', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (err) {
    console.error('register error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
