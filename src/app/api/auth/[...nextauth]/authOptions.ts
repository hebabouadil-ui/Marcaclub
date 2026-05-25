import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

const ONE_HOUR = 60 * 60
const ONE_DAY = 24 * 60 * 60

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const adminEmail = process.env.ADMIN_EMAIL
        const adminPassword = process.env.ADMIN_PASSWORD

        if (credentials.email !== adminEmail) return null

        const isValid =
          credentials.password === adminPassword ||
          (adminPassword?.startsWith('$2') &&
            (await bcrypt.compare(credentials.password, adminPassword)))

        if (!isValid) return null

        return {
          id: '1',
          email: adminEmail,
          name: 'Admin',
          role: 'admin',
          rememberMe: credentials.rememberMe === 'true',
        }
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = 'admin'
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? false
        token.issuedAt = Math.floor(Date.now() / 1000)
      }
      return token
    },
    async session({ session, token }) {
      // Enforce 1h expiry for non-remembered sessions
      if (!token.rememberMe) {
        const age = Math.floor(Date.now() / 1000) - (token.issuedAt as number ?? 0)
        if (age > ONE_HOUR) return { ...session, user: undefined as never, expires: new Date(0).toISOString() }
      }
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
        ;(session.user as { rememberMe?: boolean }).rememberMe = token.rememberMe as boolean
      }
      return session
    },
  },
  session: { strategy: 'jwt', maxAge: ONE_DAY },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.marca-club.com' : undefined,
      },
    },
  },
}
