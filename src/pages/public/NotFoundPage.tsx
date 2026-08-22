import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="mt-3 text-muted">That page is not part of the pharmacy store.</p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Back home</Button>
      </Link>
    </main>
  )
}
