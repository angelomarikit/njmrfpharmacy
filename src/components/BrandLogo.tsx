import { cn } from '@/utils/cn'
import { storeImages } from '@/data/images'

export function BrandLogo({
  className,
  size = 'header',
}: {
  className?: string
  size?: 'header' | 'footer' | 'admin'
}) {
  const sizes = {
    header: 'h-16 w-auto sm:h-[4.5rem] lg:h-[4.75rem]',
    footer: 'h-28 w-auto sm:h-32',
    admin: 'h-[4.5rem] w-auto max-w-full',
  }

  return (
    <img
      src={storeImages.logo}
      alt="NJMRF Messiah Sanare Pharmacy"
      width={1004}
      height={464}
      className={cn('block shrink-0 object-contain object-left', sizes[size], className)}
    />
  )
}
