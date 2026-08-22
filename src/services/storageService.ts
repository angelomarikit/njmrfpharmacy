import { supabase } from '@/lib/supabase'
import { uniqueFileName } from '@/utils/files'

const PUBLIC_BUCKET = 'site-assets'
const PROOF_BUCKET = 'order-proofs'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG, or WebP image.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Images must be 5 MB or smaller.'
  }
  return null
}

export async function uploadSiteAsset(siteId: string, folderPath: string, file: File): Promise<string> {
  const validationError = validateImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const path = `${siteId}/${folderPath}/${uniqueFileName(file.name)}`
  const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    console.error('Upload failed', error.message)
    throw new Error('Unable to upload this image.')
  }

  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteSiteAssetByUrl(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return

  const path = extractStoragePath(publicUrl, PUBLIC_BUCKET)
  if (!path) return

  const { error } = await supabase.storage.from(PUBLIC_BUCKET).remove([path])
  if (error) {
    console.error('Failed to delete storage object', error.message)
  }
}

export async function uploadPaymentProof(
  siteId: string,
  userId: string,
  orderId: string,
  file: File,
): Promise<string> {
  const validationError = validateImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const path = `${siteId}/customers/${userId}/${orderId}-${uniqueFileName(file.name)}`
  const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    console.error('Proof upload failed', error.message)
    throw new Error('Unable to upload the payment screenshot.')
  }

  return path
}

export async function getProofSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 60 * 30)
  if (error || !data?.signedUrl) {
    console.error('Unable to sign payment proof', error?.message)
    return null
  }
  return data.signedUrl
}

export function extractStoragePath(publicUrl: string, bucket = PUBLIC_BUCKET): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0] ?? '')
}
