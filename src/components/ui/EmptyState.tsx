import type { ReactNode } from 'react'
import { storeImages } from '@/data/images'

export function EmptyState({
  title,
  description,
  action,
  image,
}: {
  title: string
  description?: string
  action?: ReactNode
  image?: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <img src={image ?? storeImages.shelves} alt="" className="h-40 w-full object-cover" />
      <div className="px-6 py-8 text-center">
        <h3 className="font-display text-2xl text-ink">{title}</h3>
        {description ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p> : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  )
}
