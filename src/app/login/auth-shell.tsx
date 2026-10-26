import Image from 'next/image'
import Link from 'next/link'

// Shared frame for the staff password pages (/login/forgot, /login/reset):
// the login page's right-hand panel on its own, so it reads well on a phone.
export function StaffAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-6 sm:p-12">
      <div className="w-full max-w-sm space-y-8">
        <Link href="/login" className="flex items-center gap-1">
          <Image
            src="/images/Urban Simple Logos/Urban Simple Icon.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <div className="flex items-baseline gap-0.5">
            <span className="font-bold text-2xl tracking-tight text-charcoal-900">Urban</span>
            <span className="font-display italic font-normal text-2xl text-bronze-600">Simple</span>
          </div>
        </Link>
        {children}
      </div>
    </div>
  )
}
