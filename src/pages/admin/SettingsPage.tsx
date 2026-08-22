import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { updateSite } from '@/services/siteService'
import { fetchStoreSettings, updateStoreSettings } from '@/services/storeService'
import { deleteSiteAssetByUrl, uploadSiteAsset } from '@/services/storageService'
import { toUserMessage } from '@/lib/errors'
import type { PaymentProvider, StoreSettings } from '@/types/database'

export default function SettingsPage() {
  const { site, siteId, refreshSite } = useSite()
  const toast = useToast()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [name, setName] = useState(site?.name ?? '')
  const [phone, setPhone] = useState(site?.phone ?? '09457742858')
  const [address, setAddress] = useState(site?.address ?? '')
  const [email, setEmail] = useState(site?.email || 'njmrf.pharmacy@gmail.com')
  const [heroHeading, setHeroHeading] = useState(site?.hero_heading ?? '')
  const [heroSubheading, setHeroSubheading] = useState(site?.hero_subheading ?? '')
  const [shortDescription, setShortDescription] = useState(site?.short_description ?? '')
  const [logoUrl, setLogoUrl] = useState(site?.logo_url ?? '')
  const [heroUrl, setHeroUrl] = useState(site?.hero_image_url ?? '')
  const [qrUrl, setQrUrl] = useState('')
  const [provider, setProvider] = useState<PaymentProvider>('gcash')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [instructions, setInstructions] = useState('')
  const [pickup, setPickup] = useState(true)
  const [delivery, setDelivery] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    if (!siteId) return
    void fetchStoreSettings(siteId)
      .then((next) => {
        setSettings(next)
        setQrUrl(next?.payment_qr_url ?? '')
        setProvider(next?.payment_provider ?? 'gcash')
        setAccountName(next?.payment_account_name ?? '')
        setAccountNumber(next?.payment_account_number ?? '')
        setInstructions(next?.payment_instructions ?? '')
        setPickup(next?.pickup_enabled ?? true)
        setDelivery(next?.delivery_enabled ?? true)
      })
      .finally(() => setLoading(false))
  }, [siteId])

  async function upload(kind: 'logo' | 'hero' | 'payment', file: File) {
    if (!siteId) return
    setUploading(kind)
    try {
      const url = await uploadSiteAsset(siteId, kind, file)
      if (kind === 'logo') setLogoUrl(url)
      if (kind === 'hero') setHeroUrl(url)
      if (kind === 'payment') setQrUrl(url)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to upload this image.'))
    } finally {
      setUploading(null)
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!siteId || !settings) return
    setSaving(true)
    try {
      await updateSite(siteId, {
        name,
        phone,
        address,
        email,
        hero_heading: heroHeading,
        hero_subheading: heroSubheading,
        short_description: shortDescription,
        logo_url: logoUrl || null,
        hero_image_url: heroUrl || null,
      })
      await updateStoreSettings(siteId, {
        payment_qr_url: qrUrl || null,
        payment_provider: provider,
        payment_account_name: accountName || null,
        payment_account_number: accountNumber || null,
        payment_instructions: instructions || null,
        pickup_enabled: pickup,
        delivery_enabled: delivery,
      })
      await refreshSite()
      toast.success('Settings saved')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save settings.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader label="Loading settings…" />

  return (
    <form className="mx-auto max-w-3xl space-y-6" onSubmit={(event) => void handleSave(event)}>
      <div>
        <p className="text-xs tracking-[0.18em] text-forest uppercase">Store</p>
        <h1 className="font-display text-3xl">Settings</h1>
      </div>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl">Public store</h2>
        <Input label="Store name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input label="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
        <Input label="Hero heading" value={heroHeading} onChange={(event) => setHeroHeading(event.target.value)} />
        <Textarea label="Hero subheading" value={heroSubheading} onChange={(event) => setHeroSubheading(event.target.value)} />
        <Textarea label="Short description" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
        <ImageUpload
          label="Logo"
          value={logoUrl}
          uploading={uploading === 'logo'}
          fit="contain"
          onSelect={(file) => void upload('logo', file)}
          onRemove={() => {
            void deleteSiteAssetByUrl(logoUrl)
            setLogoUrl('')
          }}
        />
        <ImageUpload
          label="Hero image"
          value={heroUrl}
          uploading={uploading === 'hero'}
          onSelect={(file) => void upload('hero', file)}
          onRemove={() => {
            void deleteSiteAssetByUrl(heroUrl)
            setHeroUrl('')
          }}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-xl">QR payment</h2>
        <ImageUpload
          label="Payment QR"
          value={qrUrl}
          fit="contain"
          uploading={uploading === 'payment'}
          onSelect={(file) => void upload('payment', file)}
          onRemove={() => {
            void deleteSiteAssetByUrl(qrUrl)
            setQrUrl('')
          }}
        />
        <Select
          label="Provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as PaymentProvider)}
        >
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="bank">Bank</option>
          <option value="other">Other</option>
        </Select>
        <Input label="Account name" value={accountName} onChange={(event) => setAccountName(event.target.value)} />
        <Input label="Account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
        <Textarea
          label="Payment instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
        <Switch checked={pickup} onChange={setPickup} label="Allow store pickup" />
        <Switch checked={delivery} onChange={setDelivery} label="Allow J&T delivery" />
      </section>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  )
}
