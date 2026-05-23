import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'marcaclub-customer-secret')
const COOKIE = 'mc-customer-token'

export async function signCustomerToken(payload: { id: string; email: string; name: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyCustomerToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { id: string; email: string; name: string }
  } catch {
    return null
  }
}

export async function getCustomerSession() {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyCustomerToken(token)
}

export { COOKIE as CUSTOMER_COOKIE }
