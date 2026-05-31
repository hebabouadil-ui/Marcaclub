import { redirect } from 'next/navigation'

export default function RegisterRedirect({ searchParams }: { searchParams: Record<string, string> }) {
  const ref = searchParams.ref ? `?ref=${searchParams.ref}` : ''
  redirect(`/account/register${ref}`)
}
