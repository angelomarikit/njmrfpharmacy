import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { storeImages } from '@/data/images'
import { toUserMessage } from '@/lib/errors'

export default function LoginPage() {
  const { signIn, authError, clearAuthError } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/account'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    clearAuthError()
    try {
      await signIn(email, password)
      navigate(next)
    } catch (submitError) {
      setError(toUserMessage(submitError, 'Unable to sign in.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl items-stretch gap-0 px-4 py-10 lg:grid-cols-2 lg:py-14">
      <div className="overflow-hidden rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none">
        <img src={storeImages.shelves} alt="Pharmacy shelves" className="h-56 w-full object-cover lg:h-full" />
      </div>
      <div className="surface-card rounded-b-3xl p-8 lg:rounded-r-3xl lg:rounded-bl-none">
        <p className="section-kicker">Customer</p>
        <h1 className="mt-2 font-display text-4xl">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Sign in to checkout, pay by QR, and follow your orders.</p>
        <form className="mt-8 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error || authError ? <p className="text-sm text-red-700">{error || authError}</p> : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          No account yet?{' '}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-forest hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
