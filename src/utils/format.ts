const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
})

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function formatPeso(value: number | string | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0)
  return pesoFormatter.format(Number.isFinite(amount) ? amount : 0)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  return dateTimeFormatter.format(new Date(value))
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const dateOnly = value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split('-').map(Number)
    return dateFormatter.format(new Date(year, month - 1, day))
  }
  return dateFormatter.format(new Date(value))
}

export function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfWeek(date = new Date()): Date {
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset))
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function toIso(date: Date): string {
  return date.toISOString()
}
