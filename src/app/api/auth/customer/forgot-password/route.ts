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

    await resend.emails.send({
      from: process.env.EMAIL_FROM_NOREPLY || process.env.EMAIL_FROM || 'Marcaclub <noreply@marca-club.com>',
      to: customer.email,
      subject: 'Réinitialisation de votre mot de passe — Marcaclub',
      html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:32px;text-align:center;">
      <h1 style="color:#f59e0b;margin:0;font-size:22px;letter-spacing:6px;font-weight:900;">MARCACLUB</h1>
      <p style="color:#9ca3af;margin:6px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Premium Global Store</p>
    </div>
    <div style="padding:40px 32px;text-align:center;">
      <p style="font-size:28px;margin:0 0 12px;">🔐</p>
      <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 10px;">Réinitialiser votre mot de passe</h2>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 8px;">Bonjour <strong>${customer.name}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 28px;">Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Ce lien expire dans <strong>1 heure</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#f59e0b;color:#111827;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:4px;">Réinitialiser le mot de passe</a>
      <p style="color:#9ca3af;font-size:12px;margin:28px 0 0;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.</p>
      <p style="color:#d1d5db;font-size:11px;margin:8px 0 0;word-break:break-all;">${resetUrl}</p>
    </div>
    <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} Marcaclub · marca-club.com</p>
    </div>
  </div>
</body>
</html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('forgot-password error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
