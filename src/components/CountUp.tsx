import { useEffect, useState } from 'react'

export function CountUp({
  value,
  duration = 900,
  format,
}: {
  value: number
  duration?: number
  format?: (value: number) => string
}) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }

    const start = performance.now()
    let frame = 0

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setShown(value * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <>{format ? format(shown) : Math.round(shown)}</>
}
