import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { storeImages } from '@/data/images'
import { supabase } from '@/lib/supabase'
import { fetchSiteMembership, signOut } from '@/services/authService'
import { toUserMessage } from '@/lib/errors'

export default function AdminLoginPage() {
  const { siteId, loading: siteLoading } = useSite()
  const { user, isSiteAdmin, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (siteLoading || loading) {
    return (
      <div className="min-h-screen bg-paper">
        <PageLoader label="Loading…" />
      </div>
    )
  }

  if (user && isSiteAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!siteId) return
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
      const { data } = await supabase.auth.getUser()
      const membership = data.user ? await fetchSiteMembership(data.user.id, siteId) : null
      if (!membership) {
        await signOut()
        setError('This account is not an administrator for this pharmacy.')
        return
      }
      navigate('/admin/dashboard')
    } catch (submitError) {
      setError(toUserMessage(submitError, 'Unable to sign in.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={storeImages.pharmacist} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-forest/55" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Staff only</p>
          <h1 className="mt-3 font-display text-4xl">The counter behind the counter.</h1>
          <p className="mt-3 max-w-md text-white/80">
            Review payments, pack orders, and keep the shelf accurate for NJMRF Messiah Sanare Pharmacy.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white px-4 py-12">
        <form className="w-full max-w-md space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <BrandLogo size="header" />
          <p className="section-kicker">Staff login</p>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Enter the desk'}
          </Button>
        </form>
      </div>
    </main>
  )
}
