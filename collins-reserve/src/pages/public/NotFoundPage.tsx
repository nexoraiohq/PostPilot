import { ArrowUpRight } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <section
      aria-label="Page not found"
      className="editorial-width flex min-h-[65dvh] flex-col items-center justify-center py-20 text-center md:py-28"
    >
      <p className="text-hero text-champagne-text" aria-hidden>
        404
      </p>
      <h1 className="mt-8 text-section">This table doesn&apos;t exist.</h1>
      <p className="mt-4 max-w-md text-body text-stone">
        The page you were looking for has been cleared, moved, or perhaps was never set. Your seat at the real ones is
        still here.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <LinkButton to="/" size="md">
          Home
        </LinkButton>
        <LinkButton to="/menu" variant="secondary" size="md">
          View menu
          <ArrowUpRight className="size-4" aria-hidden />
        </LinkButton>
      </div>
    </section>
  )
}
