import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { storeImages } from '@/data/images'
import { toUserMessage } from '@/lib/errors'

export default function RegisterPage() {
  const { user, customer, signUp, completeProfile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/account'
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const completing = Boolean(user && !customer)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      if (completing) {
        await completeProfile(fullName, phone)
        navigate(next)
        return
      }
      const result = await signUp(email, password, fullName, phone)
      if (result === 'confirm') {
        setMessage('Check your email to confirm the account, then sign in.')
        return
      }
      navigate(next)
    } catch (submitError) {
      setError(toUserMessage(submitError, 'Unable to create your account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl items-stretch px-4 py-10 lg:grid-cols-2 lg:py-14">
      <div className="overflow-hidden rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none">
        <img src={storeImages.pharmacist} alt="Pharmacist at the counter" className="h-56 w-full object-cover lg:h-full" />
      </div>
      <div className="surface-card rounded-b-3xl p-8 lg:rounded-r-3xl lg:rounded-bl-none">
        <p className="section-kicker">Customer</p>
        <h1 className="mt-2 font-display text-4xl">{completing ? 'Complete your profile' : 'Create your account'}</h1>
        <p className="mt-2 text-sm text-muted">
          {completing
            ? 'Add your name and phone so we can process your orders.'
            : 'Save addresses, checkout, and upload a payment screenshot in one place.'}
        </p>
        <form className="mt-8 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          <Input label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          {!completing ? (
            <>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </>
          ) : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {message ? <p className="text-sm text-forest">{message}</p> : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : completing ? 'Save profile' : 'Create account'}
          </Button>
        </form>
        {!completing ? (
          <p className="mt-6 text-sm text-muted">
            Already have an account?{' '}
            <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-forest hover:underline">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  )
}
