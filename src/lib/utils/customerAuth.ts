import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'marcaclub-customer-secret')
const COOKIE = 'mc-customer-token'
const COOKIE_ALT = 'mc-customer' // used by email login and Google OAuth

export async function signCustomerToken(payload: { id: string; email: string; name: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyCustomerToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    // Handle both JWT formats: { id, email, name } and { sub, email, name }
    const id = (payload.id as string) ?? (payload.sub as string) ?? ''
    const email = payload.email as string
    const name = payload.name as string
    if (!email) return null
    return { id, email, name }
  } catch {
    return null
  }
}

export async function getCustomerSession() {
  const cookieStore = cookies()
  // Check both cookie names — mc-customer is set by email login and Google OAuth
  const token = cookieStore.get(COOKIE_ALT)?.value ?? cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyCustomerToken(token)
}

export { COOKIE as CUSTOMER_COOKIE }
